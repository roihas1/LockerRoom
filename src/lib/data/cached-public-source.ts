import "server-only";
import { unstable_cache } from "next/cache";
import { PUBLIC_CACHE_TAG, PUBLIC_REVALIDATE_SECONDS } from "@/lib/cache/public";
import type { DataSource } from "./types";

const opts = { revalidate: PUBLIC_REVALIDATE_SECONDS, tags: [PUBLIC_CACHE_TAG] as string[] };

/**
 * Wraps a public DataSource so each method is cross-request cached for ~60s.
 * Only use with the cookie-free anon client (published content).
 */
export function createCachedPublicSource(source: DataSource): DataSource {
  const getTeam = unstable_cache(() => source.getTeam(), ["public", "team"], opts);
  const getSeasons = unstable_cache(() => source.getSeasons(), ["public", "seasons"], opts);
  const getActiveSeason = unstable_cache(() => source.getActiveSeason(), ["public", "active-season"], opts);
  const getSeason = unstable_cache((idOrSlug: string | number) => source.getSeason(idOrSlug), ["public", "season"], opts);
  const getGames = unstable_cache((seasonId: number) => source.getGames(seasonId), ["public", "games"], opts);
  const getGame = unstable_cache((id: number) => source.getGame(id), ["public", "game"], opts);
  const getGameDetail = unstable_cache((id: number) => source.getGameDetail(id), ["public", "game-detail"], opts);
  const getGameLines = unstable_cache((gameId: number) => source.getGameLines(gameId), ["public", "game-lines"], opts);
  const getGameEvents = unstable_cache(
    (gameId: number, limit?: number) => source.getGameEvents(gameId, limit),
    ["public", "game-events"],
    opts,
  );
  const getSeasonStatLines = unstable_cache(
    (seasonId: number) => source.getSeasonStatLines(seasonId),
    ["public", "season-lines"],
    opts,
  );
  const getPlayers = unstable_cache(
    (includeInactive: boolean) => source.getPlayers({ includeInactive }),
    ["public", "players"],
    opts,
  );
  const getPlayer = unstable_cache((id: number) => source.getPlayer(id), ["public", "player"], opts);
  const getPlayerMedia = unstable_cache(
    (playerId: number, limit: number) => source.getPlayerMedia(playerId, limit),
    ["public", "player-media"],
    opts,
  );
  const getCoaches = unstable_cache(
    (includeInactive: boolean) => source.getCoaches({ includeInactive }),
    ["public", "coaches"],
    opts,
  );
  const getCoach = unstable_cache((id: number) => source.getCoach(id), ["public", "coach"], opts);
  const getRecentMedia = unstable_cache(
    (limit: number, kind: string) => source.getRecentMedia(limit, kind === "" ? undefined : (kind as "image" | "video")),
    ["public", "recent-media"],
    opts,
  );
  const getGameMedia = unstable_cache((gameId: number) => source.getGameMedia(gameId), ["public", "game-media"], opts);
  const getExercises = unstable_cache(
    (category: string) => source.getExercises(category === "" ? undefined : (category as Parameters<DataSource["getExercises"]>[0])),
    ["public", "exercises"],
    opts,
  );
  const getExercise = unstable_cache((id: number) => source.getExercise(id), ["public", "exercise"], opts);
  const getFeed = unstable_cache(
    (type: string, before: string, limit: number) =>
      source.getFeed({
        type: type === "" ? undefined : (type as Parameters<DataSource["getFeed"]>[0]["type"]),
        before: before === "" ? undefined : before,
        limit,
      }),
    ["public", "feed"],
    opts,
  );
  const getFeedItem = unstable_cache((id: number) => source.getFeedItem(id), ["public", "feed-item"], opts);
  const getAwards = unstable_cache(
    (seasonId: number) => source.getAwards(seasonId === 0 ? undefined : seasonId),
    ["public", "awards"],
    opts,
  );

  return {
    mode: source.mode,
    getTeam,
    getSeasons,
    getActiveSeason,
    getSeason,
    getGames,
    getGame,
    getGameDetail,
    getGameLines,
    getGameEvents: (gameId, limit) => getGameEvents(gameId, limit),
    getSeasonStatLines,
    getPlayers: (optsArg) => getPlayers(optsArg?.includeInactive ?? false),
    getPlayer,
    getPlayerMedia,
    getCoaches: (optsArg) => getCoaches(optsArg?.includeInactive ?? false),
    getCoach,
    getRecentMedia: (limit, kind) => getRecentMedia(limit, kind ?? ""),
    getGameMedia,
    getExercises: (category) => getExercises(category ?? ""),
    getExercise,
    getFeed: (optsArg) => getFeed(optsArg.type ?? "", optsArg.before ?? "", optsArg.limit),
    getFeedItem,
    getAwards: (seasonId) => getAwards(seasonId ?? 0),
  };
}
