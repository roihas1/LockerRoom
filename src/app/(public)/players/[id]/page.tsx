import { ViewTransition } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/common/back-link";
import { EmptyState } from "@/components/common/empty-state";
import { MediaImage } from "@/components/common/media-image";
import { ShareButton } from "@/components/common/share-button";
import { SectionHeader } from "@/components/common/section-header";
import { StatTile } from "@/components/common/stat-tile";
import { ActionGallery } from "@/components/media/action-gallery";
import { PlayerTag } from "@/components/players/player-tag";
import { SwipeNav } from "@/components/players/swipe-nav";
import { PlayerGameLogTable } from "@/components/stats/player-game-log-table";
import { PlayerTrendChart } from "@/components/stats/player-trend-chart";
import { Badge } from "@/components/ui/badge";
import { positionLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { getSeasonContext } from "@/lib/data/season";
import { shareMessage } from "@/lib/meta";
import { aggregateLines, seasonHighs, type HighKey } from "@/lib/stats/aggregate";
import { hasScoring, scoringByGameFromEvents, scoringTotal } from "@/lib/stats/scoring-from-events";
import { buildPlayerTrend } from "@/lib/stats/trends";
import { formatAverage, formatInt, formatPercent } from "@/lib/utils/numbers";
import { parseId } from "@/lib/utils/params";

const highLabels: Record<HighKey, string> = {
  points: he.stats.pointsLong,
  rebounds: he.stats.reboundsLong,
  assists: he.stats.assistsLong,
  steals: he.stats.stealsLong,
  blocks: he.stats.blocksLong,
  threeMade: he.stats.threesLong,
};

export async function generateMetadata({ params }: PageProps<"/players/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const data = getData();
  const [player, team] = await Promise.all([id ? data.getPlayer(id) : null, data.getTeam()]);
  if (!player) return { title: he.empty.notFound.title };
  const title = `#${player.jerseyNumber ?? ""} ${player.name} · ${team.name}`;
  const description = [player.position ? positionLabels[player.position] : null, player.nickname ? `״${player.nickname}״` : null, player.hashtag ? `#${player.hashtag}` : null, player.description]
    .filter(Boolean)
    .join(" · ");
  return { title: { absolute: title }, description, openGraph: { title, description, type: "profile" } };
}

export default async function PlayerPage({ params }: PageProps<"/players/[id]">) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const data = getData();
  const [player, ctx, media, team] = await Promise.all([data.getPlayer(id), getSeasonContext(), data.getPlayerMedia(id, 12), data.getTeam()]);
  if (!player) notFound();

  const lines = ctx.lines.filter((l) => l.playerId === id);
  const agg = aggregateLines(id, lines);
  const highs = seasonHighs(lines);
  const gamesById = new Map(ctx.games.map((g) => [g.id, g]));
  const log = lines
    .map((l) => ({ line: l, game: gamesById.get(l.gameId)! }))
    .filter((x) => x.game)
    .sort((a, b) => b.game.tipoffAt.localeCompare(a.game.tipoffAt));
  const trend = buildPlayerTrend(id, ctx.games, ctx.lines);
  const pointEvents = await data.getPlayerPointsEvents(
    id,
    log.map((r) => r.game.id),
  );
  const scoringByGame = scoringByGameFromEvents(pointEvents);
  const seasonScoring = scoringTotal(scoringByGame.values());
  const showEventScoring = hasScoring(seasonScoring);

  const funFacts = [
    { label: he.roster.strength, value: player.strength },
    { label: he.roster.weakness, value: player.weakness },
    { label: he.roster.quote, value: player.quote },
  ].filter((f) => f.value);

  const roster = ctx.players.filter((p) => p.isActive);
  const pos = roster.findIndex((p) => p.id === id);
  const neighbor = (i: number) => {
    const p = pos >= 0 ? roster[i] : undefined;
    return p ? { href: `/players/${p.id}`, name: p.name } : null;
  };

  return (
    <SwipeNav prev={neighbor(pos - 1)} next={neighbor(pos + 1)}>
      <div className="space-y-8">
        <BackLink href="/players" label={he.roster.title} />

        <header className="card court-bg relative grid overflow-hidden md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="relative aspect-4/5 md:aspect-auto md:min-h-96">
            <ViewTransition name={`player-photo-${player.id}`} share="morph" default="none">
              <div className="absolute inset-0">
                <MediaImage
                  media={player.photo}
                  fallback="/placeholders/player.svg"
                  alt={he.media.playerPhoto(player.name)}
                  sizes="(min-width: 768px) 40vw, 100vw"
                  priority
                />
              </div>
            </ViewTransition>
            <div className="absolute inset-0 bg-linear-to-t from-bg via-transparent to-transparent md:bg-linear-to-l" />
          </div>
          <div className="relative -mt-24 space-y-4 p-5 md:mt-0 md:self-center md:p-8">
            {player.jerseyNumber !== null ? (
              <span className="num block text-6xl leading-none font-black text-team md:text-8xl">#{player.jerseyNumber}</span>
            ) : null}
            <h1 data-user-content className="font-display text-4xl leading-tight font-black md:text-5xl">
              {player.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {player.position ? <Badge tone="team">{positionLabels[player.position]}</Badge> : null}
              {player.heightCm ? <Badge>{he.roster.heightCm(player.heightCm)}</Badge> : null}
              {player.teamRole ? (
                <Badge>
                  <span data-user-content>{player.teamRole}</span>
                </Badge>
              ) : null}
              {!player.isActive ? <Badge tone="warning">{he.roster.inactive}</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {agg.gp >= 1 ? (
                <Link
                  href={`/players/${player.id}/wrapped`}
                  className="inline-flex items-center gap-2 rounded-full bg-linear-to-l from-team to-fuchsia-500 px-4 py-2 text-sm font-extrabold text-black shadow-lg transition-transform motion-safe:hover:scale-105"
                >
                  <span aria-hidden>🎬</span>
                  {he.fun.wrapped.cta}
                </Link>
              ) : null}
              <ShareButton path={`/players/${player.id}`} text={shareMessage.player(player, team)} className="rounded-full" />
            </div>
            {player.nickname || player.hashtag ? (
              <p className="flex flex-wrap items-baseline gap-x-3 font-display text-xl font-bold text-team-2">
                {player.nickname ? (
                  <span>
                    ״<span data-user-content>{player.nickname}</span>״
                  </span>
                ) : null}
                <PlayerTag player={player} className="text-base" />
              </p>
            ) : null}
            {player.description ? (
              <p data-user-content className="max-w-prose text-text/85">
                {player.description}
              </p>
            ) : null}
            {player.intro ? (
              <figure className="max-w-prose rounded-2xl border border-team/40 bg-team/10 p-4">
                <figcaption className="mb-1 text-xs font-bold text-team">
                  <span aria-hidden>🎤 </span>
                  {he.roster.intro}
                </figcaption>
                <blockquote data-user-content className="font-display text-lg leading-snug font-extrabold">
                  {player.intro}
                </blockquote>
              </figure>
            ) : null}
          </div>
        </header>

        {funFacts.length ? (
          <dl className="grid gap-3 sm:grid-cols-3">
            {funFacts.map((f) => (
              <div key={f.label} className="card p-4">
                <dt className="text-xs font-semibold text-muted">{f.label}</dt>
                <dd data-user-content className="mt-1 font-display text-lg font-bold">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <section>
          <SectionHeader title={he.roster.seasonAverages} />
          {agg.gp ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile value={formatAverage(agg.ppg)} label={he.stats.pointsLong} sublabel="PPG" size="lg" />
              <StatTile value={formatAverage(agg.rpg)} label={he.stats.reboundsLong} sublabel="RPG" size="lg" />
              <StatTile value={formatAverage(agg.apg)} label={he.stats.assistsLong} sublabel="APG" size="lg" />
              <StatTile
                value={agg.three.attempted ? formatPercent(agg.three.pct) : formatInt(agg.gp)}
                label={agg.three.attempted ? he.stats.threePct : he.stats.gamesPlayed}
                sublabel={agg.three.attempted ? "3PT%" : "GP"}
                size="lg"
              />
              {agg.steals.games ? <StatTile value={formatAverage(agg.steals.perGame)} label={he.stats.stealsLong} sublabel="SPG" size="sm" /> : null}
              {agg.blocks.games ? <StatTile value={formatAverage(agg.blocks.perGame)} label={he.stats.blocksLong} sublabel="BPG" size="sm" /> : null}
              {agg.fg.attempted ? <StatTile value={formatPercent(agg.fg.pct)} label={he.stats.fgPct} sublabel="FG%" size="sm" /> : null}
              {agg.ft.attempted ? <StatTile value={formatPercent(agg.ft.pct)} label={he.stats.ftPct} sublabel="FT%" size="sm" /> : null}
            </div>
          ) : (
            <EmptyState emoji="📊" title={he.empty.stats.title} text={he.empty.stats.text} />
          )}
        </section>

        {agg.gp ? (
          <section>
            <SectionHeader title={he.roster.seasonTotals} />
            <div className="grid grid-cols-4 gap-2">
              <StatTile value={formatInt(agg.gp)} label={he.stats.gamesPlayed} size="sm" />
              <StatTile value={formatInt(agg.points)} label={he.stats.pointsLong} size="sm" />
              <StatTile value={formatInt(agg.rebounds)} label={he.stats.reboundsLong} size="sm" />
              <StatTile value={formatInt(agg.assists)} label={he.stats.assistsLong} size="sm" />
            </div>
            {showEventScoring ? (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs text-muted">{he.live.scoringFromEvents}</p>
                <div className="grid grid-cols-3 gap-2">
                  <StatTile value={formatInt(seasonScoring.ft)} label={he.stats.ft} sublabel="FT" size="sm" />
                  <StatTile value={formatInt(seasonScoring.two)} label={he.live.twos} sublabel={he.live.twosAbbr} size="sm" />
                  <StatTile value={formatInt(seasonScoring.three)} label={he.stats.three} sublabel="3PT" size="sm" />
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {highs.length ? (
          <section>
            <SectionHeader title={he.roster.seasonHighs} icon={<span aria-hidden>🔥</span>} />
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {highs.map((h) => {
                const g = gamesById.get(h.gameId);
                return (
                  <li key={h.key}>
                    <Link href={`/games/${h.gameId}`} className="card flex items-center justify-between gap-2 p-3 hover:border-team/50">
                      <span>
                        <span className="block text-sm font-semibold">{highLabels[h.key]}</span>
                        {g ? (
                          <span className="text-xs text-muted">
                            {he.result.vs} <span data-user-content>{g.opponent}</span>
                          </span>
                        ) : null}
                      </span>
                      <span className="num text-3xl font-black text-team">{h.value}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {trend.length >= 2 ? (
          <section>
            <SectionHeader title={he.roster.trend} icon={<span aria-hidden>📈</span>} />
            <PlayerTrendChart points={trend} />
          </section>
        ) : null}

        {log.length ? (
          <section>
            <SectionHeader title={he.roster.gameLog} />
            <PlayerGameLogTable
              log={log}
              scoringByGame={
                showEventScoring
                  ? Object.fromEntries([...scoringByGame.entries()].map(([gameId, s]) => [String(gameId), s]))
                  : undefined
              }
            />
          </section>
        ) : null}

        {media.length ? (
          <section>
            <SectionHeader title={he.roster.actionShots} icon={<span aria-hidden>📸</span>} />
            <ActionGallery media={media} />
          </section>
        ) : null}
      </div>
    </SwipeNav>
  );
}
