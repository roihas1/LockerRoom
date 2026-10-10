-- Game-day reminder emails, sent from the database via Resend.
-- Needs three Vault secrets (resend_api_key, reminder_from_email, site_url); until they exist the job is a no-op.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Tip-off time the last reminder was sent for, so rescheduling a game re-arms its reminder.
alter table public.games add column reminder_sent_for timestamptz;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.html_escape(t text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(replace(t, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

create or replace function private.send_game_reminders() returns integer
language plpgsql set search_path = '' as $$
declare
  tz constant text := 'Asia/Jerusalem';
  api_key text;
  sender text;
  site text;
  team_name text;
  g record;
  matchup text;
  subject text;
  template text;
  payload jsonb;
  sent integer := 0;
begin
  if (now() at time zone tz)::time < time '09:00' then
    return 0;
  end if;

  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key';
  select decrypted_secret into sender from vault.decrypted_secrets where name = 'reminder_from_email';
  select decrypted_secret into site from vault.decrypted_secrets where name = 'site_url';
  if api_key is null or sender is null then
    raise notice 'send_game_reminders: resend_api_key / reminder_from_email not set in Vault';
    return 0;
  end if;

  select name into team_name from public.team order by id limit 1;

  for g in
    select id, opponent, tipoff_at, location, home_away
    from public.games
    where is_published
      and status = 'scheduled'
      and tipoff_at > now()
      and (tipoff_at at time zone tz)::date = (now() at time zone tz)::date
      and reminder_sent_for is distinct from tipoff_at
  loop
    matchup := case when g.home_away = 'away'
      then g.opponent || ' נגד ' || coalesce(team_name, '')
      else coalesce(team_name, '') || ' נגד ' || g.opponent end;
    subject := 'תזכורת: משחק היום ב-' || to_char(g.tipoff_at at time zone tz, 'HH24:MI') || ' – ' || matchup;
    template :=
      '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6">'
      || '<p>היי {{name}},</p>'
      || '<p>תזכורת – היום יש משחק! 🏀</p>'
      || '<p><b>' || private.html_escape(matchup) || '</b><br>'
      || 'שעה: ' || to_char(g.tipoff_at at time zone tz, 'HH24:MI')
      || coalesce('<br>מקום: ' || private.html_escape(g.location), '')
      || '</p>'
      || coalesce('<p><a href="' || private.html_escape(rtrim(site, '/') || '/games/' || g.id) || '">לפרטי המשחק</a></p>', '')
      || '</div>';

    select jsonb_agg(jsonb_build_object(
      'from', sender,
      'to', jsonb_build_array(c.email),
      'subject', subject,
      'html', replace(template, '{{name}}', private.html_escape(split_part(p.name, ' ', 1)))
    ))
    into payload
    from public.player_contacts c
    join public.players p on p.id = c.player_id
    where p.is_active and c.email is not null;

    -- Resend's batch endpoint accepts up to 100 emails per call.
    if payload is not null then
      perform net.http_post(
        url := 'https://api.resend.com/emails/batch',
        body := payload,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),
        timeout_milliseconds := 10000
      );
      sent := sent + 1;
    end if;

    update public.games set reminder_sent_for = g.tipoff_at where id = g.id;
  end loop;

  return sent;
end;
$$;

revoke all on function private.html_escape(text), private.send_game_reminders() from public, anon, authenticated;

select cron.schedule('game-reminders', '*/15 * * * *', $$select private.send_game_reminders()$$);
