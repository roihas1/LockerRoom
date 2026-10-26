-- Cup games stay on the schedule and keep box scores, but do not count toward league W–L.
alter table public.games
  add column if not exists is_cup boolean not null default false;

comment on column public.games.is_cup is
  'When true, the game is a cup match: labeled as גביע and excluded from season win/loss record and streaks.';
