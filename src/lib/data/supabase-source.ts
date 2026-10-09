import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import type { Database, MediaRow } from "@/types/database";
import type { FeedItem, Media } from "@/types/domain";
import { toAward, toExercise, toGame, toMedia, toPlayer, toPost, toSeason, toStatLine, toTeam } from "./mappers";
import type { DataSource } from "./types";

type Client = SupabaseClient<Database>;

function must<T>(result: { data: T; error: { message: string } | null }): Exclude<T, null> {
  if (result.error) throw new Error(result.error.message);
  return result.data as Exclude<T, null>;
}

function maybe<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/**
 * Supabase-backed reads. RLS decides draft visibility: the anon client sees published content only,
 * an admin session client sees everything. `includeDrafts` only skips the explicit published filters.
 */
export function createSupabaseSource(client: Client, { includeDrafts = false } = {}): DataSource {
  const published = <Q extends { eq: (col: "is_published", v: boolean) => Q }>(q: Q) => (includeDrafts ? q : q.eq("is_published", true));

  async function mediaWithTags(rows: MediaRow[]): Promise<Media[]> {
    if (rows.length === 0) return [];
    const tags = must(
      await client
        .from("media_players")
        .select("media_id, player_id")
        .in(
          "media_id",
          rows.map((r) => r.id),
        ),
    );
    const byMedia = new Map<string, number[]>();
    for (const t of tags) byMedia.set(t.media_id, [...(byMedia.get(t.media_id) ?? []), t.player_id]);
    return rows.map((r) => toMedia(r, byMedia.get(r.id) ?? []));
  }

  async function mediaLookup(ids: (string | null)[]) {
    const unique = [...new Set(ids.filter((i): i is string => !!i))];
    const rows = unique.length ? must(await client.from("media").select("*").in("id", unique)) : [];
    const map = new Map(rows.map((r) => [r.id, toMedia(r)]));
    return (id: string | null) => (id ? (map.get(id) ?? null) : null);
  }

  async function seasonsAll() {
    await connection();
    return must(await client.from("seasons").select("*").order("start_date", { ascending: false })).map(toSeason);
  }

  return {
    mode: "supabase",

    async getTeam() {
      await connection();
      const row = must(await client.from("team").select("*").eq("id", 1).single());
      return toTeam(row, await mediaLookup([row.logo_media_id, row.cover_media_id]));
    },

    getSeasons: seasonsAll,

    async getActiveSeason() {
      const seasons = await seasonsAll();
      return seasons.find((s) => s.isActive) ?? seasons[0] ?? null;
    },

    async getSeason(idOrSlug) {
      const seasons = await seasonsAll();
      return seasons.find((s) => String(s.id) === String(idOrSlug) || s.slug === idOrSlug) ?? null;
    },

    async getGames(seasonId) {
      await connection();
      const rows = must(await published(client.from("games").select("*").eq("season_id", seasonId)).order("tipoff_at"));
      return rows.map(toGame);
    },

    async getGame(id) {
      await connection();
      const row = maybe(await published(client.from("games").select("*").eq("id", id)).maybeSingle());
      return row ? toGame(row) : null;
    },

    async getGameDetail(id) {
      await connection();
      const row = maybe(await published(client.from("games").select("*").eq("id", id)).maybeSingle());
      if (!row) return null;
      const game = toGame(row);
      const [season, lines, players, media] = await Promise.all([
        client.from("seasons").select("*").eq("id", game.seasonId).maybeSingle(),
        client.from("player_game_stats").select("*").eq("game_id", id),
        client.from("players").select("*").order("sort_order"),
        client.from("media").select("*").eq("game_id", id).order("sort_order"),
      ]);
      const playerRows = must(players);
      const lookup = await mediaLookup([...playerRows.map((p) => p.photo_media_id), game.playOfGameMediaId]);
      const gallery = await mediaWithTags(must(media));
      return {
        game,
        season: season.data ? toSeason(season.data) : null,
        lines: must(lines).map(toStatLine),
        players: playerRows.map((p) => toPlayer(p, lookup)),
        media: gallery,
        playOfGame: gallery.find((m) => m.id === game.playOfGameMediaId) ?? lookup(game.playOfGameMediaId),
      };
    },

    async getGameLines(gameId) {
      await connection();
      return must(await client.from("player_game_stats").select("*").eq("game_id", gameId)).map(toStatLine);
    },

    async getSeasonStatLines(seasonId) {
      await connection();
      const games = must(await published(client.from("games").select("id").eq("season_id", seasonId).eq("status", "final")));
      if (games.length === 0) return [];
      const rows = must(
        await client
          .from("player_game_stats")
          .select("*")
          .in(
            "game_id",
            games.map((g) => g.id),
          ),
      );
      return rows.map(toStatLine);
    },

    async getPlayers({ includeInactive = false } = {}) {
      await connection();
      let q = client.from("players").select("*");
      if (!includeInactive) q = q.eq("is_active", true);
      const rows = must(await q.order("sort_order").order("jersey_number"));
      const lookup = await mediaLookup(rows.map((r) => r.photo_media_id));
      return rows.map((r) => toPlayer(r, lookup));
    },

    async getPlayer(id) {
      await connection();
      const row = maybe(await client.from("players").select("*").eq("id", id).maybeSingle());
      if (!row) return null;
      return toPlayer(row, await mediaLookup([row.photo_media_id]));
    },

    async getPlayerMedia(playerId, limit) {
      await connection();
      const tags = must(await client.from("media_players").select("media_id").eq("player_id", playerId));
      if (tags.length === 0) return [];
      const rows = must(
        await client
          .from("media")
          .select("*")
          .in(
            "id",
            tags.map((t) => t.media_id),
          )
          .order("created_at", { ascending: false })
          .limit(limit),
      );
      return mediaWithTags(rows);
    },

    async getRecentMedia(limit, kind) {
      await connection();
      let q = client.from("media").select("*").not("game_id", "is", null);
      if (kind) q = q.eq("kind", kind);
      const rows = must(await q.order("created_at", { ascending: false }).limit(limit));
      return mediaWithTags(rows);
    },

    async getGameMedia(gameId) {
      await connection();
      return mediaWithTags(must(await client.from("media").select("*").eq("game_id", gameId).order("sort_order")));
    },

    async getExercises(category) {
      await connection();
      let q = published(client.from("exercises").select("*"));
      if (category) q = q.eq("category", category);
      const rows = must(await q.order("sort_order").order("id"));
      const lookup = await mediaLookup(rows.flatMap((r) => [r.video_media_id, r.thumbnail_media_id, r.image_media_id]));
      return rows.map((r) => toExercise(r, lookup));
    },

    async getExercise(id) {
      await connection();
      const row = maybe(await published(client.from("exercises").select("*").eq("id", id)).maybeSingle());
      if (!row) return null;
      return toExercise(row, await mediaLookup([row.video_media_id, row.thumbnail_media_id, row.image_media_id]));
    },

    async getFeed({ type, before, limit }) {
      await connection();
      const base = () => {
        let q = published(client.from("locker_room_posts").select("*"));
        if (type) q = q.eq("type", type);
        return q;
      };
      const pinnedRows = before ? [] : must(await base().eq("is_pinned", true).order("published_at", { ascending: false }));
      let rest = base().eq("is_pinned", false);
      if (before) rest = rest.lt("published_at", before);
      const restRows = must(await rest.order("published_at", { ascending: false }).limit(limit + 1));
      const pageRest = restRows.slice(0, limit);
      const rows = [...pinnedRows, ...pageRest];
      if (rows.length === 0) return { items: [], nextCursor: null };

      const postIds = rows.map((r) => r.id);
      const awardIds = rows.map((r) => r.award_id).filter((i): i is number => i !== null);
      const gameIds = rows.map((r) => r.game_id).filter((i): i is number => i !== null);
      const exerciseIds = rows.map((r) => r.exercise_id).filter((i): i is number => i !== null);
      const [mediaRes, awardsRes, gamesRes, exercisesRes] = await Promise.all([
        client.from("media").select("*").in("post_id", postIds).order("sort_order"),
        awardIds.length ? client.from("awards").select("*").in("id", awardIds) : Promise.resolve({ data: [], error: null }),
        gameIds.length ? client.from("games").select("*").in("id", gameIds) : Promise.resolve({ data: [], error: null }),
        exerciseIds.length
          ? published(client.from("exercises").select("*")).in("id", exerciseIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      const exerciseRows = must(exercisesRes);
      const media = await mediaWithTags(must(mediaRes));
      const awardRows = must(awardsRes);
      const playerIds = [
        ...rows.map((r) => r.quote_player_id),
        ...awardRows.map((a) => a.player_id),
      ].filter((i): i is number => i !== null);
      const playerRows = playerIds.length ? must(await client.from("players").select("*").in("id", playerIds)) : [];
      const lookup = await mediaLookup([
        ...playerRows.map((p) => p.photo_media_id),
        ...awardRows.map((a) => a.image_media_id),
        ...exerciseRows.flatMap((e) => [e.video_media_id, e.thumbnail_media_id, e.image_media_id]),
      ]);
      const plays = new Map(exerciseRows.map((e) => [e.id, toExercise(e, lookup)]));
      const players = new Map(playerRows.map((p) => [p.id, toPlayer(p, lookup)]));
      const awards = new Map(awardRows.map((a) => [a.id, toAward(a, lookup)]));
      const games = new Map(must(gamesRes).map((g) => [g.id, toGame(g)]));

      const items: FeedItem[] = rows.map((r) => {
        const award = r.award_id ? (awards.get(r.award_id) ?? null) : null;
        return {
          ...toPost(
            r,
            media.filter((m) => m.postId === r.id),
          ),
          award,
          awardPlayer: award ? (players.get(award.playerId) ?? null) : null,
          quotePlayer: r.quote_player_id ? (players.get(r.quote_player_id) ?? null) : null,
          game: r.game_id ? (games.get(r.game_id) ?? null) : null,
          play: r.exercise_id ? (plays.get(r.exercise_id) ?? null) : null,
        };
      });
      const last = pageRest.at(-1);
      return { items, nextCursor: restRows.length > limit && last ? last.published_at : null };
    },

    async getAwards(seasonId) {
      await connection();
      let q = published(client.from("awards").select("*"));
      if (seasonId) q = q.eq("season_id", seasonId);
      const rows = must(await q.order("awarded_on", { ascending: false }));
      const lookup = await mediaLookup(rows.map((r) => r.image_media_id));
      return rows.map((r) => toAward(r, lookup));
    },
  };
}
