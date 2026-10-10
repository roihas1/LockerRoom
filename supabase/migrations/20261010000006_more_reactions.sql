-- More reaction kinds: heart, clap, shock, cry, skull.

alter table public.post_reactions drop constraint post_reactions_emoji_check;
alter table public.post_reactions
  add constraint post_reactions_emoji_check
  check (emoji in ('laugh', 'fire', 'brick', 'goat', 'heart', 'clap', 'shock', 'cry', 'skull'));

create or replace function public.toggle_reaction(p_post_id bigint, p_device_id uuid, p_emoji text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  counts jsonb;
begin
  if p_emoji not in ('laugh', 'fire', 'brick', 'goat', 'heart', 'clap', 'shock', 'cry', 'skull') then
    raise exception 'invalid reaction' using errcode = '22023';
  end if;
  if not exists (select 1 from public.locker_room_posts where id = p_post_id and is_published) then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  delete from public.post_reactions
  where post_id = p_post_id and device_id = p_device_id and emoji = p_emoji;

  if not found then
    select count(*) into recent
    from public.post_reactions
    where device_id = p_device_id and created_at > now() - interval '1 hour';
    if recent >= 60 then
      raise exception 'rate limited' using errcode = '54000';
    end if;
    insert into public.post_reactions (post_id, device_id, emoji) values (p_post_id, p_device_id, p_emoji);
  end if;

  select coalesce(jsonb_object_agg(emoji, total), '{}'::jsonb) into counts
  from (
    select emoji, count(*)::integer as total
    from public.post_reactions
    where post_id = p_post_id
    group by emoji
  ) s;
  return counts;
end;
$$;
