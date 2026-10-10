import type {
  Award,
  Coach,
  Exercise,
  ExerciseCategory,
  FeedItem,
  Game,
  GameDetailData,
  GameEvent,
  Media,
  MediaKind,
  Player,
  PostType,
  Season,
  StatLine,
  Team,
} from "@/types/domain";

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

/**
 * Read-side contract shared by the fixture and Supabase implementations.
 * Public sources return only published content; admin sources include drafts.
 */
export interface DataSource {
  readonly mode: "demo" | "supabase";
  getTeam(): Promise<Team>;
  getSeasons(): Promise<Season[]>;
  getActiveSeason(): Promise<Season | null>;
  getSeason(idOrSlug: string | number): Promise<Season | null>;
  getGames(seasonId: number): Promise<Game[]>;
  getGame(id: number): Promise<Game | null>;
  getGameDetail(id: number): Promise<GameDetailData | null>;
  getGameLines(gameId: number): Promise<StatLine[]>;
  /** Play-by-play of a game, newest first. */
  getGameEvents(gameId: number, limit?: number): Promise<GameEvent[]>;
  /** Stat rows of final, published games in a season. */
  getSeasonStatLines(seasonId: number): Promise<StatLine[]>;
  getPlayers(opts?: { includeInactive?: boolean }): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | null>;
  getPlayerMedia(playerId: number, limit: number): Promise<Media[]>;
  getCoaches(opts?: { includeInactive?: boolean }): Promise<Coach[]>;
  getCoach(id: number): Promise<Coach | null>;
  getRecentMedia(limit: number, kind?: MediaKind): Promise<Media[]>;
  getGameMedia(gameId: number): Promise<Media[]>;
  getExercises(category?: ExerciseCategory): Promise<Exercise[]>;
  getExercise(id: number): Promise<Exercise | null>;
  getFeed(opts: { type?: PostType; before?: string; limit: number }): Promise<FeedPage>;
  getFeedItem(id: number): Promise<FeedItem | null>;
  getAwards(seasonId?: number): Promise<Award[]>;
}
