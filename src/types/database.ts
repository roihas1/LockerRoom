// Mirrors supabase/migrations. Regenerate with `npm run db:types` once a Supabase project is linked.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type GameStatus = "scheduled" | "live" | "final" | "postponed" | "cancelled";
type HomeAway = "home" | "away" | "neutral";
type PlayerPosition = "guard" | "forward" | "center";
type ExerciseCategory =
  | "pick_and_roll"
  | "set_play"
  | "motion"
  | "inbound"
  | "fast_break"
  | "zone_offense"
  | "late_game";
type Difficulty = "easy" | "medium" | "hard";
type PostType = "announcement" | "photo" | "video" | "funny_moment" | "quote" | "highlight" | "award" | "play" | "milestone";
type GameEventKind = "points" | "rebound" | "assist" | "steal" | "block" | "turnover" | "opponent_points";
type PushTopic = "games" | "live" | "plays" | "feed";
type AwardCategory = "official" | "fun";
type MediaKind = "image" | "video";
type AppRole = "user" | "admin";

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
};

export type MediaRow = {
  id: string;
  kind: MediaKind;
  storage_key: string;
  poster_key: string | null;
  title: string | null;
  caption: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  game_id: number | null;
  post_id: number | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
};

export type TeamRow = {
  id: number;
  name: string;
  short_name: string;
  description: string | null;
  primary_color: string;
  secondary_color: string;
  logo_media_id: string | null;
  cover_media_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SeasonRow = {
  id: number;
  name: string;
  slug: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PlayerRow = {
  id: number;
  name: string;
  jersey_number: number | null;
  position: PlayerPosition | null;
  height_cm: number | null;
  photo_media_id: string | null;
  nickname: string | null;
  team_role: string | null;
  description: string | null;
  strength: string | null;
  weakness: string | null;
  quote: string | null;
  intro: string | null;
  hashtag: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PlayerContactRow = {
  player_id: number;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  birthday_push_sent_on: string | null;
  created_at: string;
  updated_at: string;
};

export type GameRow = {
  id: number;
  season_id: number;
  round_number: number | null;
  opponent: string;
  tipoff_at: string;
  location: string | null;
  home_away: HomeAway;
  status: GameStatus;
  team_score: number | null;
  opponent_score: number | null;
  recap: string | null;
  player_of_game_id: number | null;
  potg_note: string | null;
  play_of_game_media_id: string | null;
  reminder_sent_for: string | null;
  final_push_sent_at: string | null;
  live_max_deficit: number;
  live_extra_push_count: number;
  live_comeback_push_sent_at: string | null;
  live_lead_push_sent_at: string | null;
  ibba_event_id: number | null;
  ibba_snapshot: Json | null;
  ibba_checked_at: string | null;
  is_published: boolean;
  is_practice: boolean;
  created_at: string;
  updated_at: string;
};

export type PlayerGameStatRow = {
  id: number;
  game_id: number;
  player_id: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fouls: number | null;
  fg_made: number | null;
  fg_attempted: number | null;
  three_made: number | null;
  three_attempted: number | null;
  ft_made: number | null;
  ft_attempted: number | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseRow = {
  id: number;
  title: string;
  category: ExerciseCategory;
  description: string | null;
  instructions: string[];
  coaching_points: string[];
  duration_minutes: number | null;
  difficulty: Difficulty | null;
  video_media_id: string | null;
  thumbnail_media_id: string | null;
  image_media_id: string | null;
  diagram: unknown | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AwardRow = {
  id: number;
  season_id: number;
  title: string;
  emoji: string | null;
  category: AwardCategory;
  description: string | null;
  player_id: number;
  game_id: number | null;
  image_media_id: string | null;
  awarded_on: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type PostRow = {
  id: number;
  type: PostType;
  title: string | null;
  body: string | null;
  quote_player_id: number | null;
  game_id: number | null;
  award_id: number | null;
  exercise_id: number | null;
  milestone_key: string | null;
  milestone_player_id: number | null;
  is_pinned: boolean;
  is_published: boolean;
  published_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaPlayerRow = { media_id: string; player_id: number };

export type GameEventRow = {
  id: number;
  game_id: number;
  player_id: number | null;
  kind: GameEventKind;
  value: number;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  topics: PushTopic[];
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  last_success_at: string | null;
};

export type PushBroadcastRow = {
  id: number;
  title: string;
  body: string;
  url: string;
  sent_count: number;
  created_by: string | null;
  created_at: string;
};

export type CoachRow = {
  id: number;
  name: string;
  role: string | null;
  photo_media_id: string | null;
  nickname: string | null;
  description: string | null;
  strength: string | null;
  weakness: string | null;
  quote: string | null;
  intro: string | null;
  hashtag: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type IbbaSyncRunRow = {
  id: number;
  mode: string;
  ran_at: string;
  changes: Json;
  error: string | null;
};

export type IbbaTeamRow = { id: number; name: string; updated_at: string };

export type IbbaLeagueGameRow = {
  event_id: number;
  played_at: string;
  home_team_id: number;
  away_team_id: number;
  home_points: number;
  away_points: number;
  played: boolean;
  updated_at: string;
};

export type IbbaPlayerRow = {
  player_id: number;
  team_id: number;
  name: string;
  number: string | null;
  position: string | null;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  threes_made: number;
  ft_pct: number | null;
  updated_at: string;
};

export type OpponentScoutingRow = {
  opponent_name: string;
  notes: string | null;
  key_players: Json;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id" | "email">;
      media: Table<MediaRow, "kind" | "storage_key">;
      team: Table<TeamRow, "name" | "short_name">;
      seasons: Table<SeasonRow, "name" | "slug" | "start_date" | "end_date">;
      players: Table<PlayerRow, "name">;
      coaches: Table<CoachRow, "name">;
      player_contacts: Table<PlayerContactRow, "player_id">;
      games: Table<GameRow, "season_id" | "opponent" | "tipoff_at">;
      player_game_stats: Table<PlayerGameStatRow, "game_id" | "player_id">;
      exercises: Table<ExerciseRow, "title" | "category">;
      awards: Table<AwardRow, "season_id" | "title" | "player_id">;
      locker_room_posts: Table<PostRow, "type">;
      media_players: Table<MediaPlayerRow, "media_id" | "player_id">;
      game_events: Table<GameEventRow, "game_id" | "kind" | "value">;
      push_subscriptions: Table<PushSubscriptionRow, "endpoint" | "p256dh" | "auth">;
      push_broadcasts: Table<PushBroadcastRow, "title">;
      ibba_sync_runs: Table<IbbaSyncRunRow, "mode">;
      ibba_teams: Table<IbbaTeamRow, "id" | "name">;
      ibba_league_games: Table<IbbaLeagueGameRow, "event_id" | "played_at" | "home_team_id" | "away_team_id">;
      ibba_players: Table<IbbaPlayerRow, "player_id" | "team_id" | "name">;
      opponent_scouting: Table<OpponentScoutingRow, "opponent_name">;
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      admin_set_role: { Args: { target_email: string; new_role: AppRole }; Returns: undefined };
      reaction_counts: { Args: { p_post_ids: number[] }; Returns: { post_id: number; emoji: string; total: number }[] };
      toggle_reaction: { Args: { p_post_id: number; p_device_id: string; p_emoji: string }; Returns: Record<string, number> };
    };
    Enums: {
      game_status: GameStatus;
      home_away: HomeAway;
      player_position: PlayerPosition;
      exercise_category: ExerciseCategory;
      difficulty: Difficulty;
      post_type: PostType;
      award_category: AwardCategory;
      media_kind: MediaKind;
      app_role: AppRole;
    };
    CompositeTypes: Record<never, never>;
  };
};
