-- Live stats can record blocks; play-by-play events need a matching kind.
alter table public.game_events
  drop constraint if exists game_events_kind_check;

alter table public.game_events
  add constraint game_events_kind_check
  check (kind in ('points', 'rebound', 'assist', 'steal', 'block', 'turnover', 'opponent_points'));
