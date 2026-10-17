export type GameStatus = "scheduled" | "live" | "final" | "postponed" | "cancelled";
export type HomeAway = "home" | "away" | "neutral";
export type PlayerPosition = "guard" | "forward" | "center";
export type ExerciseCategory =
  | "pick_and_roll"
  | "set_play"
  | "motion"
  | "inbound"
  | "fast_break"
  | "zone_offense"
  | "late_game";
export type Difficulty = "easy" | "medium" | "hard";
export type PostType = "announcement" | "photo" | "video" | "funny_moment" | "quote" | "highlight" | "award" | "play" | "milestone";
export type GameEventKind = "points" | "rebound" | "assist" | "steal" | "block" | "turnover" | "opponent_points";
export type AwardCategory = "official" | "fun";
export type MediaKind = "image" | "video";
export type AppRole = "user" | "admin";

export interface Media {
  id: string;
  kind: MediaKind;
  storageKey: string;
  posterKey: string | null;
  title: string | null;
  caption: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  gameId: number | null;
  postId: number | null;
  sortOrder: number;
  playerIds: number[];
  createdAt: string;
}

export interface Team {
  name: string;
  shortName: string;
  description: string | null;
  primaryColor: string;
  secondaryColor: string;
  logo: Media | null;
  cover: Media | null;
}

export interface Season {
  id: number;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Player {
  id: number;
  name: string;
  jerseyNumber: number | null;
  position: PlayerPosition | null;
  heightCm: number | null;
  photo: Media | null;
  nickname: string | null;
  teamRole: string | null;
  description: string | null;
  strength: string | null;
  weakness: string | null;
  quote: string | null;
  /** Read out like a pre-game announcer introduction. */
  intro: string | null;
  /** Stored without the leading `#`. */
  hashtag: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Coach {
  id: number;
  name: string;
  /** e.g. "מאמן ראשי", "עוזר מאמן". */
  role: string | null;
  photo: Media | null;
  nickname: string | null;
  description: string | null;
  strength: string | null;
  weakness: string | null;
  quote: string | null;
  intro: string | null;
  /** Stored without the leading `#`. */
  hashtag: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Game {
  id: number;
  seasonId: number;
  roundNumber: number | null;
  opponent: string;
  tipoffAt: string;
  location: string | null;
  homeAway: HomeAway;
  status: GameStatus;
  teamScore: number | null;
  opponentScore: number | null;
  recap: string | null;
  playerOfGameId: number | null;
  potgNote: string | null;
  playOfGameMediaId: string | null;
  isPublished: boolean;
  /** Practice / exhibition: shown publicly but excluded from W–L and season streaks. */
  isPractice: boolean;
}

export interface StatLine {
  gameId: number;
  playerId: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fouls: number | null;
  fgMade: number | null;
  fgAttempted: number | null;
  threeMade: number | null;
  threeAttempted: number | null;
  ftMade: number | null;
  ftAttempted: number | null;
}

export interface Exercise {
  id: number;
  title: string;
  category: ExerciseCategory;
  description: string | null;
  instructions: string[];
  coachingPoints: string[];
  durationMinutes: number | null;
  difficulty: Difficulty | null;
  video: Media | null;
  thumbnail: Media | null;
  image: Media | null;
  isPublished: boolean;
  sortOrder: number;
}

export interface Award {
  id: number;
  seasonId: number;
  title: string;
  emoji: string | null;
  category: AwardCategory;
  description: string | null;
  playerId: number;
  gameId: number | null;
  image: Media | null;
  awardedOn: string;
  isPublished: boolean;
}

export interface Post {
  id: number;
  type: PostType;
  title: string | null;
  body: string | null;
  quotePlayerId: number | null;
  gameId: number | null;
  awardId: number | null;
  exerciseId: number | null;
  milestonePlayerId: number | null;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt: string;
  media: Media[];
}

/** One play-by-play entry of a live game. `playerId` is null for opponent points. */
export interface GameEvent {
  id: number;
  gameId: number;
  playerId: number | null;
  kind: GameEventKind;
  value: number;
  createdAt: string;
}

export type ReactionKind = "laugh" | "fire" | "brick" | "goat" | "heart" | "clap" | "shock" | "cry" | "skull";
export type ReactionCounts = Record<ReactionKind, number>;

export interface FeedItem extends Post {
  reactions: ReactionCounts;
  award: Award | null;
  quotePlayer: Player | null;
  awardPlayer: Player | null;
  milestonePlayer: Player | null;
  game: Game | null;
  play: Exercise | null;
}

export interface GameDetailData {
  game: Game;
  season: Season | null;
  lines: StatLine[];
  players: Player[];
  media: Media[];
  playOfGame: Media | null;
}
