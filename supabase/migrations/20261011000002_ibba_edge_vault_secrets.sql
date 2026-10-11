-- Edge Function ibba-sync can read job secrets from Vault when env vars are unset (service_role RPC only).

create or replace function public.internal_push_dispatch_secret()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
$$;

create or replace function public.internal_site_url()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'site_url';
$$;

revoke all on function public.internal_push_dispatch_secret() from public, anon, authenticated;
revoke all on function public.internal_site_url() from public, anon, authenticated;
grant execute on function public.internal_push_dispatch_secret() to service_role;
grant execute on function public.internal_site_url() to service_role;
