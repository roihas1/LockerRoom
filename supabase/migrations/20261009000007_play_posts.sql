-- Publishing a play shares it to the locker room feed as a 'play' post linked to the exercise.
alter type public.post_type add value if not exists 'play';

alter table public.locker_room_posts
  add column exercise_id bigint references public.exercises (id) on delete cascade,
  add constraint posts_play_ref check (type::text <> 'play' or exercise_id is not null);

create index posts_exercise on public.locker_room_posts (exercise_id);
