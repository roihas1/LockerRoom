-- Coaching staff. Same profile fields as players, but no jersey, position or stats.

create table public.coaches (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 80),
  role text check (char_length(role) <= 80),
  photo_media_id uuid references public.media (id) on delete set null,
  nickname text check (char_length(nickname) <= 40),
  description text check (char_length(description) <= 500),
  strength text check (char_length(strength) <= 200),
  weakness text check (char_length(weakness) <= 200),
  quote text check (char_length(quote) <= 200),
  intro text check (char_length(intro) <= 160),
  hashtag text check (char_length(hashtag) <= 30 and hashtag !~ '[\s#]'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coaches_photo on public.coaches (photo_media_id);

create trigger coaches_updated before update on public.coaches
  for each row execute function public.set_updated_at();

alter table public.coaches enable row level security;

grant select on public.coaches to anon, authenticated;
grant insert, update, delete on public.coaches to authenticated;

create policy coaches_read on public.coaches for select to anon, authenticated using (true);
create policy coaches_admin_insert on public.coaches for insert to authenticated
  with check ((select public.is_admin()));
create policy coaches_admin_update on public.coaches for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy coaches_admin_delete on public.coaches for delete to authenticated
  using ((select public.is_admin()));
