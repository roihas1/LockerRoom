-- Run birthday pushes once a day at 09:00 Asia/Jerusalem (not every hour).
-- 06:00 and 07:00 UTC cover 09:00 Israel in summer and winter; the hour gate runs it once.

create or replace function private.send_birthday_pushes() returns integer
language plpgsql set search_path = '' as $$
declare
  tz constant text := 'Asia/Jerusalem';
  site text;
  push_secret text;
begin
  if extract(hour from now() at time zone tz)::integer <> 9 then
    return 0;
  end if;

  select decrypted_secret into site from vault.decrypted_secrets where name = 'site_url';
  select decrypted_secret into push_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if site is null or push_secret is null then
    raise notice 'send_birthday_pushes: site_url / push_dispatch_secret not set in Vault';
    return 0;
  end if;

  perform net.http_post(
    url := rtrim(site, '/') || '/api/push/birthdays',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', push_secret
    ),
    timeout_milliseconds := 30000
  );

  return 1;
end;
$$;

revoke all on function private.send_birthday_pushes() from public, anon, authenticated;

select cron.unschedule('birthday-pushes');
select cron.schedule('birthday-pushes', '0 6,7 * * *', $$select private.send_birthday_pushes()$$);
