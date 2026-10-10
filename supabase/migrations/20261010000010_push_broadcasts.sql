-- Custom notifications admins send to every subscribed device, kept as a short history on the admin page.

create table public.push_broadcasts (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 300),
  url text not null default '/' check (url like '/%' and char_length(url) <= 300),
  sent_count integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index push_broadcasts_created_at on public.push_broadcasts (created_at desc);
create index push_broadcasts_created_by on public.push_broadcasts (created_by);

alter table public.push_broadcasts enable row level security;

create policy push_broadcasts_admin_read on public.push_broadcasts for select to authenticated
  using ((select public.is_admin()));
create policy push_broadcasts_admin_insert on public.push_broadcasts for insert to authenticated
  with check ((select public.is_admin()));
