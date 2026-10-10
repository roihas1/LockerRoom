-- Web push subscriptions, one row per browser/device. Visitors are anonymous, so a subscription
-- belongs to a device, not a player. Only the server (service role) reads or writes this table.

create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  topics text[] not null default array['games', 'live', 'plays', 'feed'],
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  constraint push_subscriptions_topics_valid check (topics <@ array['games', 'live', 'plays', 'feed'])
);

create index push_subscriptions_topics on public.push_subscriptions using gin (topics);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- Set once the final-score notification went out, so re-saving or re-publishing a final game doesn't notify twice.
alter table public.games add column final_push_sent_at timestamptz;

-- Game-day reminders now go out as push notifications too. Each channel runs only when its secrets exist:
-- email needs resend_api_key + reminder_from_email; push needs site_url + push_dispatch_secret.
create or replace function private.send_game_reminders() returns integer
language plpgsql set search_path = '' as $$
declare
  tz constant text := 'Asia/Jerusalem';
  api_key text;
  sender text;
  site text;
  push_secret text;
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
  select decrypted_secret into push_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if (api_key is null or sender is null) and (site is null or push_secret is null) then
    raise notice 'send_game_reminders: neither email (resend_api_key, reminder_from_email) nor push (site_url, push_dispatch_secret) is configured in Vault';
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

    if api_key is not null and sender is not null then
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
      end if;
    end if;

    if site is not null and push_secret is not null then
      perform net.http_post(
        url := rtrim(site, '/') || '/api/push/dispatch',
        body := jsonb_build_object(
          'topic', 'games',
          'title', '🏀 משחק היום ב-' || to_char(g.tipoff_at at time zone tz, 'HH24:MI'),
          'body', matchup || coalesce(' · ' || g.location, ''),
          'url', '/games/' || g.id,
          'tag', 'game-reminder-' || g.id
        ),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', push_secret),
        timeout_milliseconds := 10000
      );
    end if;

    sent := sent + 1;
    update public.games set reminder_sent_for = g.tipoff_at where id = g.id;
  end loop;

  return sent;
end;
$$;

revoke all on function private.send_game_reminders() from public, anon, authenticated;
