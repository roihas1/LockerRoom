-- Track mid-game live push moments (comeback / lead invite). Extra pushes are capped at 3 per game;
-- game-started and final-score notifications stay outside this budget.

alter table public.games
  add column live_max_deficit int not null default 0,
  add column live_extra_push_count smallint not null default 0,
  add column live_comeback_push_sent_at timestamptz,
  add column live_lead_push_sent_at timestamptz;

alter table public.games
  add constraint games_live_max_deficit_nonneg check (live_max_deficit >= 0),
  add constraint games_live_extra_push_count_range check (live_extra_push_count >= 0 and live_extra_push_count <= 3);

comment on column public.games.live_max_deficit is
  'Highest opponent lead (opponent_score - team_score) seen during live scoring; used for comeback push.';
comment on column public.games.live_extra_push_count is
  'Number of mid-game live moment pushes sent (max 3). Start and final pushes are separate.';
comment on column public.games.live_comeback_push_sent_at is
  'Set once the comeback (was down >=10, now leading) push went out.';
comment on column public.games.live_lead_push_sent_at is
  'Set once the lead-by-10 play-by-play invite push went out.';
