-- IBBA schedule sync + scouting cache. Edge Function ibba-sync is triggered daily at 08:00 Israel time.
-- Vault secrets: site_url, push_dispatch_secret, ibba_sync_url (full URL to .../functions/v1/ibba-sync).

alter table public.games
  add column ibba_event_id bigint unique,
  add column ibba_snapshot jsonb,
  add column ibba_checked_at timestamptz;

create table public.ibba_sync_runs (
  id bigint generated always as identity primary key,
  mode text not null check (mode in ('schedule', 'scouting')),
  ran_at timestamptz not null default now(),
  changes jsonb not null default '[]'::jsonb,
  error text
);

create index ibba_sync_runs_ran_at on public.ibba_sync_runs (ran_at desc);

create table public.ibba_teams (
  id bigint primary key,
  name text not null,
  updated_at timestamptz not null default now()
);

create table public.ibba_league_games (
  event_id bigint primary key,
  played_at timestamptz not null,
  home_team_id bigint not null references public.ibba_teams (id) on delete cascade,
  away_team_id bigint not null references public.ibba_teams (id) on delete cascade,
  home_points smallint not null default 0 check (home_points >= 0),
  away_points smallint not null default 0 check (away_points >= 0),
  played boolean not null default false,
  updated_at timestamptz not null default now()
);

create index ibba_league_games_home on public.ibba_league_games (home_team_id, played_at desc);
create index ibba_league_games_away on public.ibba_league_games (away_team_id, played_at desc);

create table public.ibba_players (
  player_id bigint not null,
  team_id bigint not null references public.ibba_teams (id) on delete cascade,
  name text not null,
  number text,
  position text,
  games smallint not null default 0 check (games >= 0),
  ppg numeric(6, 2) not null default 0,
  rpg numeric(6, 2) not null default 0,
  apg numeric(6, 2) not null default 0,
  threes_made smallint not null default 0 check (threes_made >= 0),
  ft_pct numeric(5, 2),
  updated_at timestamptz not null default now(),
  primary key (player_id, team_id)
);

create index ibba_players_team_ppg on public.ibba_players (team_id, ppg desc);

create table public.opponent_scouting (
  opponent_name text primary key check (char_length(opponent_name) between 1 and 80),
  notes text check (notes is null or char_length(notes) <= 2000),
  key_players jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ibba_sync_runs enable row level security;
alter table public.ibba_teams enable row level security;
alter table public.ibba_league_games enable row level security;
alter table public.ibba_players enable row level security;
alter table public.opponent_scouting enable row level security;

revoke all on public.ibba_sync_runs from anon, authenticated;

create policy ibba_sync_runs_admin_select on public.ibba_sync_runs
  for select to authenticated using ((select public.is_admin()));

create policy ibba_teams_public_select on public.ibba_teams for select using (true);
create policy ibba_league_games_public_select on public.ibba_league_games for select using (true);
create policy ibba_players_public_select on public.ibba_players for select using (true);
create policy opponent_scouting_public_select on public.opponent_scouting for select using (true);

create policy opponent_scouting_admin_insert on public.opponent_scouting
  for insert to authenticated with check ((select public.is_admin()));
create policy opponent_scouting_admin_update on public.opponent_scouting
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy opponent_scouting_admin_delete on public.opponent_scouting
  for delete to authenticated using ((select public.is_admin()));

-- Service role (edge function) writes ibba cache tables; no authenticated insert policies needed.

create or replace function private.run_ibba_sync(p_mode text) returns void
language plpgsql set search_path = '' as $$
declare
  tz constant text := 'Asia/Jerusalem';
  fn_url text;
  push_secret text;
begin
  if extract(hour from now() at time zone tz) <> 8 then
    return;
  end if;
  if p_mode not in ('schedule', 'scouting') then
    raise exception 'invalid ibba sync mode';
  end if;

  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'ibba_sync_url';
  select decrypted_secret into push_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if fn_url is null or push_secret is null then
    raise notice 'run_ibba_sync: ibba_sync_url or push_dispatch_secret not set in Vault';
    return;
  end if;

  perform net.http_post(
    url := fn_url,
    body := jsonb_build_object('mode', p_mode),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', push_secret
    ),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function private.run_ibba_sync(text) from public, anon, authenticated;

-- 05:00 and 06:00 UTC cover 08:00 Israel in winter and summer; hour gate runs the job once.
select cron.schedule('ibba-sync-schedule', '0 5,6 * * *', $$select private.run_ibba_sync('schedule')$$);
select cron.schedule('ibba-sync-scouting', '15 5,6 * * *', $$select private.run_ibba_sync('scouting')$$);
