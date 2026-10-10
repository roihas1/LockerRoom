-- Play-by-play for live games. Rows are derived on the server by diffing consecutive live stat snapshots;
-- an undo deletes the newest matching events. player_id is null for opponent points.

create table public.game_events (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games (id) on delete cascade,
  player_id bigint references public.players (id) on delete cascade,
  kind text not null check (kind in ('points', 'rebound', 'assist', 'steal', 'turnover', 'opponent_points')),
  value integer not null check (value > 0),
  created_at timestamptz not null default now(),
  constraint game_events_player_kind check ((kind = 'opponent_points') = (player_id is null))
);

create index game_events_game_recent on public.game_events (game_id, created_at desc, id desc);

alter table public.game_events enable row level security;

create policy game_events_read on public.game_events for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.games g where g.id = game_id and g.is_published)
  );

create policy game_events_admin_insert on public.game_events for insert to authenticated
  with check ((select public.is_admin()));
create policy game_events_admin_delete on public.game_events for delete to authenticated
  using ((select public.is_admin()));

grant select on public.game_events to anon, authenticated;
grant insert, delete on public.game_events to authenticated;
grant usage, select on sequence public.game_events_id_seq to authenticated;

-- Fans' game pages subscribe to these tables; RLS still decides which rows each client receives.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.games, public.player_game_stats, public.game_events;
