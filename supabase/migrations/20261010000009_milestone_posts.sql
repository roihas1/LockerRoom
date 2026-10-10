-- Automatic milestone / record posts (e.g. "reached 100 points this season", new season high).
-- milestone_key makes generation idempotent: the same milestone is never posted twice.

alter type public.post_type add value if not exists 'milestone';

alter table public.locker_room_posts add column milestone_key text;
alter table public.locker_room_posts add column milestone_player_id bigint references public.players (id) on delete set null;
-- A plain (non-partial) unique constraint so inserts can target it with ON CONFLICT; NULLs never collide.
alter table public.locker_room_posts add constraint locker_room_posts_milestone_key unique (milestone_key);
