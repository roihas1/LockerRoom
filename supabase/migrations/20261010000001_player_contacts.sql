-- Private contact details for players. Kept out of public.players because that table is publicly readable.

create table public.player_contacts (
  player_id bigint primary key references public.players (id) on delete cascade,
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 20),
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger player_contacts_updated before update on public.player_contacts
  for each row execute function public.set_updated_at();

alter table public.player_contacts enable row level security;

revoke all on public.player_contacts from anon;
grant select, insert, update, delete on public.player_contacts to authenticated;

create policy player_contacts_admin_select on public.player_contacts for select to authenticated
  using ((select public.is_admin()));
create policy player_contacts_admin_insert on public.player_contacts for insert to authenticated
  with check ((select public.is_admin()));
create policy player_contacts_admin_update on public.player_contacts for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy player_contacts_admin_delete on public.player_contacts for delete to authenticated
  using ((select public.is_admin()));
