-- Row Level Security: public read of published content, admin-only writes.
-- is_admin() is security definer, so policies never recurse into profiles' own RLS.

alter table public.team enable row level security;
alter table public.seasons enable row level security;
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.player_game_stats enable row level security;
alter table public.media enable row level security;
alter table public.media_players enable row level security;
alter table public.exercises enable row level security;
alter table public.awards enable row level security;
alter table public.locker_room_posts enable row level security;

grant usage on schema public to anon, authenticated;
grant select on
  public.team, public.seasons, public.players, public.games, public.player_game_stats,
  public.media, public.media_players, public.exercises, public.awards, public.locker_room_posts
  to anon, authenticated;
grant insert, update, delete on
  public.team, public.seasons, public.players, public.games, public.player_game_stats,
  public.media, public.media_players, public.exercises, public.awards, public.locker_room_posts
  to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- profiles: readable by self or admins; no client writes at all (trigger + admin_set_role only).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Always-public tables.
create policy team_read on public.team for select to anon, authenticated using (true);
create policy seasons_read on public.seasons for select to anon, authenticated using (true);
create policy players_read on public.players for select to anon, authenticated using (true);

-- Draftable tables.
create policy games_read on public.games for select to anon, authenticated
  using (is_published or (select public.is_admin()));
create policy exercises_read on public.exercises for select to anon, authenticated
  using (is_published or (select public.is_admin()));
create policy awards_read on public.awards for select to anon, authenticated
  using (is_published or (select public.is_admin()));
create policy posts_read on public.locker_room_posts for select to anon, authenticated
  using (is_published or (select public.is_admin()));

-- Stats are visible only when their game is published.
create policy pgs_read on public.player_game_stats for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.games g where g.id = game_id and g.is_published)
  );

-- Media: gallery items follow their parent's visibility; slot media (no gallery parent) is public.
create policy media_read on public.media for select to anon, authenticated
  using (
    (select public.is_admin())
    or (game_id is null and post_id is null)
    or exists (select 1 from public.games g where g.id = game_id and g.is_published)
    or exists (select 1 from public.locker_room_posts p where p.id = post_id and p.is_published)
  );

create policy media_players_read on public.media_players for select to anon, authenticated
  using (exists (select 1 from public.media m where m.id = media_id));

-- Admin-only writes, one policy per command so intent stays explicit.
do $$
declare
  t text;
begin
  foreach t in array array[
    'team', 'seasons', 'players', 'games', 'player_game_stats', 'media', 'media_players',
    'exercises', 'awards', 'locker_room_posts'
  ] loop
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))', t || '_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t || '_admin_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))', t || '_admin_delete', t);
  end loop;
end;
$$;
