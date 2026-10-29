import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader, SectionHeader } from "@/components/common/section-header";
import { StatTile } from "@/components/common/stat-tile";
import { SeasonSelect } from "@/components/games/season-select";
import { GamesStatsTable } from "@/components/stats/games-stats-table";
import { HotPlayerCard } from "@/components/stats/hot-player-card";
import { LeaderCard } from "@/components/stats/leader-board";
import { PlayersStatsTable } from "@/components/stats/players-stats-table";
import { ShameAwards } from "@/components/stats/shame-awards";
import { TeamStatsStrip } from "@/components/stats/team-stats-strip";
import { TeamTrendChart } from "@/components/stats/team-trend-chart";
import { he } from "@/config/strings";
import { getSeasonContext } from "@/lib/data/season";
import { teamSeasonAverages } from "@/lib/stats/aggregate";
import { record } from "@/lib/stats/games";
import { computeLeaders, countPotgByPlayer, minGamesForLeaders } from "@/lib/stats/leaders";
import { computeShameAwards } from "@/lib/stats/shame";
import { buildTeamTrend, computeHotPlayer } from "@/lib/stats/trends";
import { cn } from "@/lib/utils/cn";
import { formatAverage, formatInt, formatPercent } from "@/lib/utils/numbers";
import { firstParam } from "@/lib/utils/params";

export const metadata: Metadata = { title: he.statsPage.title };

const views = ["overview", "players", "leaders", "games"] as const;
type View = (typeof views)[number];
const viewLabels: Record<View, string> = {
  overview: he.statsPage.overview,
  players: he.statsPage.players,
  leaders: he.statsPage.leaders,
  games: he.statsPage.games,
};

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const sp = await searchParams;
  const viewParam = firstParam(sp.view);
  const view: View = views.includes(viewParam as View) ? (viewParam as View) : "overview";
  const seasonParam = firstParam(sp.season);
  const ctx = await getSeasonContext(seasonParam);

  const href = (params: Record<string, string>) => {
    const q = new URLSearchParams({ ...(seasonParam ? { season: seasonParam } : {}), ...params });
    return `/stats?${q.toString()}`;
  };

  return (
    <>
      <PageHeader title={he.statsPage.title} subtitle={ctx.season ? he.home.season(ctx.season.name) : undefined} />
      <SeasonSelect seasons={ctx.seasons} current={ctx.season} basePath="/stats" extraParams={{ view }} />

      <nav aria-label={he.statsPage.title} className="sticky top-[calc(3.5rem+var(--safe-top))] z-30 -mx-4 mt-3 mb-6 border-b border-border bg-bg px-4 md:top-[calc(4rem+var(--safe-top))]">
        <ul className="flex gap-1 overflow-x-auto scrollbar-none">
          {views.map((v) => (
            <li key={v}>
              <Link
                href={href({ view: v })}
                scroll={false}
                aria-current={v === view ? "page" : undefined}
                className={cn(
                  "block border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap",
                  v === view ? "border-team text-team" : "border-transparent text-muted hover:text-text",
                )}
              >
                {viewLabels[v]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {ctx.completed.length === 0 ? (
        <EmptyState emoji="📊" title={he.empty.stats.title} text={he.empty.stats.text} />
      ) : view === "overview" ? (
        <Overview ctx={ctx} />
      ) : view === "players" ? (
        <PlayersStatsTable aggregates={ctx.aggregates} players={ctx.players} />
      ) : view === "leaders" ? (
        <div className="space-y-10">
          <Leaders ctx={ctx} />
          <ShameAwards awards={computeShameAwards(ctx.aggregates, ctx.statCompleted.length, ctx.lines)} playersById={ctx.playersById} />
        </div>
      ) : (
        <GamesStatsTable games={ctx.statCompleted} lines={ctx.lines} playersById={ctx.playersById} />
      )}
    </>
  );
}

type Ctx = Awaited<ReturnType<typeof getSeasonContext>>;

function Overview({ ctx }: { ctx: Ctx }) {
  const avg = teamSeasonAverages(ctx.games, ctx.lines);
  const rec = record(ctx.games);
  const hot = computeHotPlayer(ctx.games, ctx.lines);
  const teamTrend = buildTeamTrend(ctx.games);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile value={`${rec.losses}-${rec.wins}`} label={he.stats.record} sublabel="L-W" size="lg" />
        <StatTile value={formatAverage(avg.ppg)} label={he.stats.pointsFor} sublabel="PPG" size="lg" />
        <StatTile value={formatAverage(avg.oppPpg)} label={he.stats.pointsAgainst} size="lg" />
        <StatTile value={formatInt(avg.gp)} label={he.stats.gamesPlayed} sublabel="GP" size="lg" />
      </div>
      {hot ? (
        <section>
          <SectionHeader title={he.statsPage.hotPlayer.title} icon={<span aria-hidden>🔥</span>} />
          <HotPlayerCard hot={hot} player={ctx.playersById.get(hot.playerId)} />
        </section>
      ) : null}
      <section>
        <SectionHeader title={he.statsPage.teamAverages} />
        <TeamStatsStrip averages={avg} wins={rec.wins} />
        {avg.ftPct !== null ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <StatTile value={formatPercent(avg.ftPct)} label={he.stats.ftPct} sublabel="FT%" size="sm" />
          </div>
        ) : null}
      </section>
      {teamTrend.length >= 2 ? (
        <section>
          <SectionHeader title={he.statsPage.trends.teamTitle} />
          <TeamTrendChart points={teamTrend} />
        </section>
      ) : null}
      <Leaders ctx={ctx} limit={3} />
    </div>
  );
}

function Leaders({ ctx, limit = 5 }: { ctx: Ctx; limit?: number }) {
  const boards = computeLeaders(ctx.aggregates, ctx.statCompleted.length, {
    limit,
    potgCounts: countPotgByPlayer(ctx.games),
  });
  return (
    <section>
      <SectionHeader title={he.statsPage.leaders} />
      <p className="-mt-2 mb-3 text-xs text-muted">{he.statsPage.minGames(minGamesForLeaders(ctx.statCompleted.length))}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((b) => (
          <LeaderCard key={b.category} board={b} playersById={ctx.playersById} />
        ))}
      </div>
    </section>
  );
}

