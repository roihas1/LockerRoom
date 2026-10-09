-- The exercises table is the team's offensive playbook, so categories describe play types rather than drills.
-- Postgres cannot drop enum values, so the type is rebuilt; existing rows map to the closest play type.
alter table public.exercises alter column category type text;
drop type public.exercise_category;
create type public.exercise_category as enum (
  'pick_and_roll', 'set_play', 'motion', 'inbound', 'fast_break', 'zone_offense', 'late_game'
);
alter table public.exercises
  alter column category type public.exercise_category
  using (case when category in (
    'pick_and_roll', 'set_play', 'motion', 'inbound', 'fast_break', 'zone_offense', 'late_game'
  ) then category else 'set_play' end)::public.exercise_category;
