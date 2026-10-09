-- Core schema for the single-team basketball site.
-- Stats averages are never stored; they are derived from player_game_stats at read time.

create extension if not exists pgcrypto;

create type public.game_status as enum ('scheduled', 'live', 'final', 'postponed', 'cancelled');
create type public.home_away as enum ('home', 'away', 'neutral');
create type public.player_position as enum ('guard', 'forward', 'center');
create type public.exercise_category as enum (
  'shooting', 'ball_handling', 'finishing', 'defense', 'passing', 'athleticism', 'conditioning', 'warm_up'
);
create type public.difficulty as enum ('easy', 'medium', 'hard');
create type public.post_type as enum ('announcement', 'photo', 'video', 'funny_moment', 'quote', 'highlight', 'award');
create type public.award_category as enum ('official', 'fun');
create type public.media_kind as enum ('image', 'video');
create type public.app_role as enum ('user', 'admin');

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles is created here (not in the auth migration) so media.created_by can reference it.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));

create table public.media (
  id uuid primary key default gen_random_uuid(),
  kind public.media_kind not null,
  storage_key text not null unique,
  poster_key text,
  title text check (char_length(title) <= 200),
  caption text check (char_length(caption) <= 500),
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  width integer check (width > 0),
  height integer check (height > 0),
  duration_seconds numeric(8, 2) check (duration_seconds >= 0),
  game_id bigint,
  post_id bigint,
  sort_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint media_single_gallery check (num_nonnulls(game_id, post_id) <= 1),
  constraint media_key_prefix check (
    (kind = 'image' and storage_key like 'images/%')
    or (kind = 'video' and storage_key like 'videos/%')
    or storage_key like 'placeholder:%'
  )
);

create table public.team (
  id smallint primary key default 1 check (id = 1),
  name text not null check (char_length(name) between 1 and 80),
  short_name text not null check (char_length(short_name) between 1 and 40),
  description text check (char_length(description) <= 1000),
  primary_color text not null default '#2563eb' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text not null default '#ffffff' check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  logo_media_id uuid references public.media (id) on delete set null,
  cover_media_id uuid references public.media (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 40),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_dates check (end_date >= start_date)
);
create unique index seasons_single_active on public.seasons (is_active) where is_active;

create table public.players (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 80),
  jersey_number smallint check (jersey_number between 0 and 99),
  position public.player_position,
  height_cm smallint check (height_cm between 140 and 230),
  photo_media_id uuid references public.media (id) on delete set null,
  nickname text check (char_length(nickname) <= 40),
  team_role text check (char_length(team_role) <= 80),
  description text check (char_length(description) <= 500),
  strength text check (char_length(strength) <= 120),
  weakness text check (char_length(weakness) <= 120),
  quote text check (char_length(quote) <= 200),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index players_active_jersey on public.players (jersey_number) where is_active and jersey_number is not null;

create table public.games (
  id bigint generated always as identity primary key,
  season_id bigint not null references public.seasons (id) on delete restrict,
  round_number smallint check (round_number > 0),
  opponent text not null check (char_length(opponent) between 1 and 80),
  tipoff_at timestamptz not null,
  location text check (char_length(location) <= 120),
  home_away public.home_away not null default 'home',
  status public.game_status not null default 'scheduled',
  team_score smallint check (team_score >= 0),
  opponent_score smallint check (opponent_score >= 0),
  recap text check (char_length(recap) <= 5000),
  player_of_game_id bigint references public.players (id) on delete set null,
  potg_note text check (char_length(potg_note) <= 300),
  play_of_game_media_id uuid references public.media (id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_final_scores check (
    status <> 'final'
    or (team_score is not null and opponent_score is not null and team_score <> opponent_score)
  ),
  constraint games_round_unique unique (season_id, round_number)
);

create table public.player_game_stats (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games (id) on delete cascade,
  player_id bigint not null references public.players (id) on delete restrict,
  points smallint not null default 0 check (points >= 0),
  rebounds smallint not null default 0 check (rebounds >= 0),
  assists smallint not null default 0 check (assists >= 0),
  steals smallint check (steals >= 0),
  blocks smallint check (blocks >= 0),
  turnovers smallint check (turnovers >= 0),
  fouls smallint check (fouls >= 0),
  fg_made smallint check (fg_made >= 0),
  fg_attempted smallint check (fg_attempted >= 0),
  three_made smallint check (three_made >= 0),
  three_attempted smallint check (three_attempted >= 0),
  ft_made smallint check (ft_made >= 0),
  ft_attempted smallint check (ft_attempted >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pgs_unique unique (game_id, player_id),
  constraint pgs_fg check (fg_made is null or (fg_attempted is not null and fg_made <= fg_attempted)),
  constraint pgs_three check (three_made is null or (three_attempted is not null and three_made <= three_attempted)),
  constraint pgs_ft check (ft_made is null or (ft_attempted is not null and ft_made <= ft_attempted)),
  constraint pgs_three_in_fg check (
    (three_made is null or fg_made is null or three_made <= fg_made)
    and (three_attempted is null or fg_attempted is null or three_attempted <= fg_attempted)
  )
);

create table public.exercises (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  category public.exercise_category not null,
  description text check (char_length(description) <= 1000),
  instructions text[] not null default '{}',
  coaching_points text[] not null default '{}',
  duration_minutes smallint check (duration_minutes > 0 and duration_minutes <= 240),
  difficulty public.difficulty,
  video_media_id uuid references public.media (id) on delete set null,
  thumbnail_media_id uuid references public.media (id) on delete set null,
  image_media_id uuid references public.media (id) on delete set null,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.awards (
  id bigint generated always as identity primary key,
  season_id bigint not null references public.seasons (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 80),
  emoji text check (char_length(emoji) <= 16),
  category public.award_category not null default 'fun',
  description text check (char_length(description) <= 500),
  player_id bigint not null references public.players (id) on delete cascade,
  game_id bigint references public.games (id) on delete set null,
  image_media_id uuid references public.media (id) on delete set null,
  awarded_on date not null default current_date,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locker_room_posts (
  id bigint generated always as identity primary key,
  type public.post_type not null,
  title text check (char_length(title) <= 120),
  body text check (char_length(body) <= 3000),
  quote_player_id bigint references public.players (id) on delete set null,
  game_id bigint references public.games (id) on delete set null,
  award_id bigint references public.awards (id) on delete cascade,
  is_pinned boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_award_ref check (type <> 'award' or award_id is not null)
);

alter table public.media
  add constraint media_game_fk foreign key (game_id) references public.games (id) on delete cascade,
  add constraint media_post_fk foreign key (post_id) references public.locker_room_posts (id) on delete cascade;

create table public.media_players (
  media_id uuid not null references public.media (id) on delete cascade,
  player_id bigint not null references public.players (id) on delete cascade,
  primary key (media_id, player_id)
);

-- Indexes for common filters and every foreign key.
create index games_season_tipoff on public.games (season_id, tipoff_at);
create index games_published_status on public.games (is_published, status);
create index games_potg on public.games (player_of_game_id);
create index games_play_media on public.games (play_of_game_media_id);
create index pgs_player on public.player_game_stats (player_id);
create index media_game on public.media (game_id, sort_order);
create index media_post on public.media (post_id, sort_order);
create index media_created_by on public.media (created_by);
create index media_players_player on public.media_players (player_id);
create index posts_feed on public.locker_room_posts (is_published, published_at desc);
create index posts_game on public.locker_room_posts (game_id);
create index posts_award on public.locker_room_posts (award_id);
create index posts_quote_player on public.locker_room_posts (quote_player_id);
create index posts_created_by on public.locker_room_posts (created_by);
create index awards_player on public.awards (player_id);
create index awards_game on public.awards (game_id);
create index awards_season on public.awards (season_id);
create index awards_image on public.awards (image_media_id);
create index exercises_category on public.exercises (category, sort_order);
create index exercises_video on public.exercises (video_media_id);
create index exercises_thumb on public.exercises (thumbnail_media_id);
create index exercises_image on public.exercises (image_media_id);
create index players_photo on public.players (photo_media_id);
create index team_logo on public.team (logo_media_id);
create index team_cover on public.team (cover_media_id);

create trigger team_updated before update on public.team for each row execute function public.set_updated_at();
create trigger seasons_updated before update on public.seasons for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger players_updated before update on public.players for each row execute function public.set_updated_at();
create trigger games_updated before update on public.games for each row execute function public.set_updated_at();
create trigger pgs_updated before update on public.player_game_stats for each row execute function public.set_updated_at();
create trigger exercises_updated before update on public.exercises for each row execute function public.set_updated_at();
create trigger awards_updated before update on public.awards for each row execute function public.set_updated_at();
create trigger posts_updated before update on public.locker_room_posts for each row execute function public.set_updated_at();

-- Every deployment has exactly one team row.
insert into public.team (id, name, short_name) values (1, 'הקבוצה שלנו', 'הקבוצה') on conflict do nothing;
