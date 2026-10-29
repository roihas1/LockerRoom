-- A game can keep its score, box score and place in the W–L record while being left out of player and team
-- statistics (season averages, leaders, hot player, milestones, PIR award).
alter table public.games
  add column if not exists exclude_from_stats boolean not null default false;

comment on column public.games.exclude_from_stats is
  'When true, the game still shows (score, box score, W–L) but its player lines and team numbers are left out of season averages and leaderboards.';
