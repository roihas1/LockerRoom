-- Exhibition / practice games stay on the schedule and keep box scores, but do not count toward W–L.
alter table public.games
  add column if not exists is_practice boolean not null default false;

comment on column public.games.is_practice is
  'When true, the game is shown publicly but excluded from season win/loss record and streaks.';
