-- Expose said_on / source_url on public list + fan submit; allow admin inserts.

drop function if exists public.list_approved_cup_cliches();
create or replace function public.list_approved_cup_cliches()
returns table (
  id bigint,
  body text,
  said_by text,
  weight integer,
  verified boolean,
  said_on text,
  source_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.body, c.said_by, c.weight, c.verified, c.said_on, c.source_url
  from public.cup_cliches c
  where c.status = 'approved'
  order by c.id;
$$;

drop function if exists public.submit_cup_cliche(text, text, integer, uuid);
create or replace function public.submit_cup_cliche(
  p_body text,
  p_said_by text,
  p_weight integer,
  p_device_id uuid,
  p_said_on text default null,
  p_source_url text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
  cleaned_body text;
  cleaned_said text;
  cleaned_on text;
  cleaned_source text;
  new_id bigint;
begin
  cleaned_body := trim(regexp_replace(coalesce(p_body, ''), '\s+', ' ', 'g'));
  cleaned_said := trim(regexp_replace(coalesce(p_said_by, ''), '\s+', ' ', 'g'));
  cleaned_on := nullif(trim(regexp_replace(coalesce(p_said_on, ''), '\s+', ' ', 'g')), '');
  cleaned_source := nullif(trim(coalesce(p_source_url, '')), '');

  if char_length(cleaned_body) < 2 or char_length(cleaned_body) > 120 then
    raise exception 'invalid body' using errcode = '22023';
  end if;
  if char_length(cleaned_said) < 2 or char_length(cleaned_said) > 120 then
    raise exception 'invalid said_by' using errcode = '22023';
  end if;
  if p_weight not in (60, 80, 100) then
    raise exception 'invalid weight' using errcode = '22023';
  end if;
  if cleaned_body ~ '[<>]' or cleaned_said ~ '[<>]' then
    raise exception 'invalid characters' using errcode = '22023';
  end if;
  if cleaned_body ~* 'https?://|www\.|@|#|javascript:' or cleaned_said ~* 'https?://|www\.|javascript:' then
    raise exception 'invalid characters' using errcode = '22023';
  end if;
  if cleaned_on is not null and (char_length(cleaned_on) > 40 or cleaned_on ~ '[<>]') then
    raise exception 'invalid said_on' using errcode = '22023';
  end if;
  if cleaned_source is not null then
    if char_length(cleaned_source) > 500 then
      raise exception 'invalid source' using errcode = '22023';
    end if;
    if cleaned_source !~* '^https://' then
      raise exception 'invalid source' using errcode = '22023';
    end if;
  end if;

  select count(*) into recent
  from public.cup_cliches
  where device_id = p_device_id and created_at > now() - interval '1 hour';
  if recent >= 3 then
    raise exception 'rate limited' using errcode = '54000';
  end if;

  insert into public.cup_cliches (body, said_by, weight, verified, said_on, source_url, status, device_id)
  values (cleaned_body, cleaned_said, p_weight, false, cleaned_on, cleaned_source, 'pending', p_device_id)
  returning id into new_id;

  return new_id;
exception
  when unique_violation then
    raise exception 'duplicate' using errcode = '23505';
end;
$$;

revoke all on function public.list_approved_cup_cliches() from public;
revoke all on function public.submit_cup_cliche(text, text, integer, uuid, text, text) from public;
grant execute on function public.list_approved_cup_cliches() to anon, authenticated;
grant execute on function public.submit_cup_cliche(text, text, integer, uuid, text, text) to anon, authenticated;

grant insert on public.cup_cliches to authenticated;
drop policy if exists cup_cliches_admin_insert on public.cup_cliches;
create policy cup_cliches_admin_insert on public.cup_cliches
  for insert to authenticated with check ((select public.is_admin()));
