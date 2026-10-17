import {
  fixtureAwards,
  fixtureCoaches,
  fixtureExercises,
  fixtureGameMedia,
  fixtureGames,
  fixturePlayers,
  fixturePosts,
  fixtureSeasons,
  fixtureStatLines,
  fixtureTeam,
} from "@/fixtures";
import type { FeedItem, Media, Post } from "@/types/domain";
import { emptyReactions } from "@/lib/reactions";
import type { DataSource } from "./types";

const allMedia = (): Media[] => [...fixtureGameMedia, ...fixturePosts.flatMap((p) => p.media)];

/** In-memory implementation backed by the typed fixtures. Used when Supabase is not configured. */
export function createFixtureSource({ includeDrafts = false } = {}): DataSource {
  const visible = <T extends { isPublished: boolean }>(items: T[]) => (includeDrafts ? items : items.filter((i) => i.isPublished));
  const publishedGameIds = () => new Set(visible(fixtureGames).map((g) => g.id));
  const toFeedItem = (p: Post): FeedItem => {
    const award = fixtureAwards.find((a) => a.id === p.awardId) ?? null;
    return {
      ...p,
      award,
      awardPlayer: award ? (fixturePlayers.find((pl) => pl.id === award.playerId) ?? null) : null,
      quotePlayer: fixturePlayers.find((pl) => pl.id === p.quotePlayerId) ?? null,
      milestonePlayer: fixturePlayers.find((pl) => pl.id === p.milestonePlayerId) ?? null,
      game: fixtureGames.find((g) => g.id === p.gameId) ?? null,
      play: visible(fixtureExercises).find((e) => e.id === p.exerciseId) ?? null,
      reactions: emptyReactions(),
    };
  };

  return {
    mode: "demo",
    async getTeam() {
      return fixtureTeam;
    },
    async getSeasons() {
      return [...fixtureSeasons].sort((a, b) => b.startDate.localeCompare(a.startDate));
    },
    async getActiveSeason() {
      return fixtureSeasons.find((s) => s.isActive) ?? fixtureSeasons[0] ?? null;
    },
    async getSeason(idOrSlug) {
      return fixtureSeasons.find((s) => String(s.id) === String(idOrSlug) || s.slug === idOrSlug) ?? null;
    },
    async getGames(seasonId) {
      return visible(fixtureGames)
        .filter((g) => g.seasonId === seasonId)
        .sort((a, b) => a.tipoffAt.localeCompare(b.tipoffAt));
    },
    async getGame(id) {
      return visible(fixtureGames).find((g) => g.id === id) ?? null;
    },
    async getGameDetail(id) {
      const game = visible(fixtureGames).find((g) => g.id === id);
      if (!game) return null;
      const media = fixtureGameMedia.filter((m) => m.gameId === id);
      return {
        game,
        season: fixtureSeasons.find((s) => s.id === game.seasonId) ?? null,
        lines: fixtureStatLines.filter((l) => l.gameId === id),
        players: fixturePlayers,
        media,
        playOfGame: media.find((m) => m.id === game.playOfGameMediaId) ?? null,
      };
    },
    async getGameLines(gameId) {
      return fixtureStatLines.filter((l) => l.gameId === gameId);
    },
    async getGameEvents() {
      return [];
    },
    async getPlayerPointsEvents() {
      return [];
    },
    async getSeasonStatLines(seasonId) {
      const ids = new Set(
        visible(fixtureGames)
          .filter((g) => g.seasonId === seasonId && g.status === "final")
          .map((g) => g.id),
      );
      return fixtureStatLines.filter((l) => ids.has(l.gameId));
    },
    async getPlayers({ includeInactive = false } = {}) {
      return fixturePlayers.filter((p) => includeInactive || p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async getPlayer(id) {
      return fixturePlayers.find((p) => p.id === id) ?? null;
    },
    async getCoaches({ includeInactive = false } = {}) {
      return fixtureCoaches.filter((c) => includeInactive || c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async getCoach(id) {
      return fixtureCoaches.find((c) => c.id === id) ?? null;
    },
    async getPlayerMedia(playerId, limit) {
      const ids = publishedGameIds();
      return allMedia()
        .filter((m) => m.playerIds.includes(playerId) && (m.gameId === null || ids.has(m.gameId)))
        .slice(0, limit);
    },
    async getRecentMedia(limit, kind) {
      const ids = publishedGameIds();
      return [...fixtureGameMedia]
        .filter((m) => (!kind || m.kind === kind) && m.gameId !== null && ids.has(m.gameId))
        .sort((a, b) => (b.gameId ?? 0) - (a.gameId ?? 0) || a.sortOrder - b.sortOrder)
        .slice(0, limit);
    },
    async getGameMedia(gameId) {
      return fixtureGameMedia.filter((m) => m.gameId === gameId).sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async getExercises(category) {
      return visible(fixtureExercises)
        .filter((e) => !category || e.category === category)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async getExercise(id) {
      return visible(fixtureExercises).find((e) => e.id === id) ?? null;
    },
    async getFeed({ type, before, limit }) {
      const matching = visible(fixturePosts)
        .filter((p) => !type || p.type === type)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      const pinned = before ? [] : matching.filter((p) => p.isPinned);
      const posts = matching.filter((p) => !p.isPinned && (!before || p.publishedAt < before));
      const pageRest = posts.slice(0, limit);
      const page = [...pinned, ...pageRest];
      const last = pageRest.at(-1);
      return { items: page.map(toFeedItem), nextCursor: posts.length > limit && last ? last.publishedAt : null };
    },
    async getFeedItem(id) {
      const post = visible(fixturePosts).find((p) => p.id === id);
      return post ? toFeedItem(post) : null;
    },
    async getAwards(seasonId) {
      return visible(fixtureAwards)
        .filter((a) => !seasonId || a.seasonId === seasonId)
        .sort((a, b) => b.awardedOn.localeCompare(a.awardedOn));
    },
  };
}
