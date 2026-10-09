-- Admin authorization: profiles rows are created by trigger, and roles change only through admin_set_role.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Promote or demote a user by email. Only admins may call it; nobody can demote themselves or the last admin.
create or replace function public.admin_set_role(target_email text, new_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare
  target_id uuid;
  admin_count integer;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select id into target_id from public.profiles where lower(email) = lower(target_email);
  if target_id is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  if new_role <> 'admin' then
    if target_id = (select auth.uid()) then
      raise exception 'self_demote' using errcode = 'P0001';
    end if;
    select count(*) into admin_count from public.profiles where role = 'admin';
    if admin_count <= 1 then
      raise exception 'last_admin' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles set role = new_role where id = target_id;
end;
$$;

revoke all on function public.admin_set_role(text, public.app_role) from public, anon;
grant execute on function public.admin_set_role(text, public.app_role) to authenticated;
