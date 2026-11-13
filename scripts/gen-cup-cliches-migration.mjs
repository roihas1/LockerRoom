import fs from "node:fs";

const rows = JSON.parse(fs.readFileSync("src/fixtures/cup-cliches.json", "utf8"));

function esc(s) {
  if (s == null) return "null";
  return `'${String(s).replace(/'/g, "''")}'`;
}

const values = rows
  .map((r) => {
    const source = r.source ? esc(r.source) : "null";
    const date = r.date ? esc(r.date) : "null";
    return `(${esc(r.text)}, ${esc(r.saidBy)}, ${r.weight}, ${r.verified}, ${date}, ${source}, 'approved')`;
  })
  .join(",\n  ");

const sql = `-- Cup clichés: curated quotes + fan submissions (pending until admin approves).
-- Public reads/writes go through security definer RPCs so device_id stays private.
-- Admin moderates via session client + is_admin() RLS.

create table public.cup_cliches (
  id bigint generated always as identity primary key,
  body text not null,
  said_by text not null,
  weight integer not null default 80 check (weight between 1 and 100),
  verified boolean not null default false,
  said_on text,
  source_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  device_id uuid,
  created_at timestamptz not null default now(),
  constraint cup_cliches_body_len check (char_length(body) between 2 and 120),
  constraint cup_cliches_said_by_len check (char_length(said_by) between 2 and 120),
  constraint cup_cliches_body_unique unique (body)
);

create index cup_cliches_status_weight on public.cup_cliches (status, weight desc);
create index cup_cliches_device_recent on public.cup_cliches (device_id, created_at) where device_id is not null;
create index cup_cliches_pending on public.cup_cliches (created_at desc) where status = 'pending';

alter table public.cup_cliches enable row level security;
revoke all on public.cup_cliches from anon, authenticated;
grant select, update, delete on public.cup_cliches to authenticated;

create policy cup_cliches_admin_select on public.cup_cliches
  for select to authenticated using ((select public.is_admin()));
create policy cup_cliches_admin_update on public.cup_cliches
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy cup_cliches_admin_delete on public.cup_cliches
  for delete to authenticated using ((select public.is_admin()));

create or replace function public.list_approved_cup_cliches()
returns table (id bigint, body text, said_by text, weight integer, verified boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.body, c.said_by, c.weight, c.verified
  from public.cup_cliches c
  where c.status = 'approved'
  order by c.id;
$$;

create or replace function public.submit_cup_cliche(
  p_body text,
  p_said_by text,
  p_weight integer,
  p_device_id uuid
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
  new_id bigint;
begin
  cleaned_body := trim(regexp_replace(coalesce(p_body, ''), '\\s+', ' ', 'g'));
  cleaned_said := trim(regexp_replace(coalesce(p_said_by, ''), '\\s+', ' ', 'g'));

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
  if cleaned_body ~* 'https?://|www\\.|@|#|javascript:' or cleaned_said ~* 'https?://|www\\.|javascript:' then
    raise exception 'invalid characters' using errcode = '22023';
  end if;

  select count(*) into recent
  from public.cup_cliches
  where device_id = p_device_id and created_at > now() - interval '1 hour';
  if recent >= 3 then
    raise exception 'rate limited' using errcode = '54000';
  end if;

  insert into public.cup_cliches (body, said_by, weight, verified, status, device_id)
  values (cleaned_body, cleaned_said, p_weight, false, 'pending', p_device_id)
  returning id into new_id;

  return new_id;
exception
  when unique_violation then
    raise exception 'duplicate' using errcode = '23505';
end;
$$;

revoke all on function public.list_approved_cup_cliches() from public;
revoke all on function public.submit_cup_cliche(text, text, integer, uuid) from public;
grant execute on function public.list_approved_cup_cliches() to anon, authenticated;
grant execute on function public.submit_cup_cliche(text, text, integer, uuid) to anon, authenticated;

-- Allow admin push topic (fan topics stay the same; fan UI never offers admin).
alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_topics_valid;
alter table public.push_subscriptions
  add constraint push_subscriptions_topics_valid
  check (topics <@ array['games', 'live', 'plays', 'feed', 'admin']::text[]);

insert into public.cup_cliches (body, said_by, weight, verified, said_on, source_url, status)
values
  ${values}
on conflict (body) do nothing;
`;

fs.writeFileSync("supabase/migrations/20261113120000_cup_cliches.sql", sql);
console.log(`wrote migration with ${rows.length} seed rows`);
