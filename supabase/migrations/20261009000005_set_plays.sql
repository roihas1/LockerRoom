-- Team set plays (e.g. horns, floppy) live alongside drills as an exercise category.
alter type public.exercise_category add value if not exists 'set_play' before 'shooting';
