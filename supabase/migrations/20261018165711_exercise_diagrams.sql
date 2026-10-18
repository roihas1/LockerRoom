-- Interactive playbook diagrams for practice mode (nullable = play has no practice yet).
alter table public.exercises
  add column if not exists diagram jsonb;

comment on column public.exercises.diagram is
  'Half-court practice diagram: versioned JSON with player positions and step actions (pass/shoot).';
