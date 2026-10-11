import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { ResultBadge } from "@/components/common/result-badge";
import { PageHeader, SectionHeader } from "@/components/common/section-header";
import { StatTile } from "@/components/common/stat-tile";
import { SeasonSelect } from "@/components/games/season-select";
import { LeaderCard } from "@/components/stats/leader-board";
import { PlayersStatsTable, sortKeys, type SortKey } from "@/components/stats/players-stats-table";
import { ShameAwards } from "@/components/stats/shame-awards";
import { TeamStatsStrip } from "@/components/stats/team-stats-strip";
import { he } from "@/config/strings";
import { getSeasonContext } from "@/lib/data/season";
import { teamGameTotals, teamSeasonAverages } from "@/lib/stats/aggregate";
import { record } from "@/lib/stats/games";
import { computeLeaders, minGamesForLeaders } from "@/lib/stats/leaders";
import { computeShameAwards } from "@/lib/stats/shame";
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/dates";
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
  const sortParam = firstParam(sp.sort);
  const sort: SortKey = sortKeys.includes(sortParam as SortKey) ? (sortParam as SortKey) : "ppg";
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

      <nav aria-label={he.statsPage.title} className="sticky top-[calc(3.5rem+var(--safe-top))] z-30 -mx-4 mt-3 mb-6 border-b border-border bg-bg/90 px-4 backdrop-blur md:top-[calc(4rem+var(--safe-top))]">
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
        <PlayersStatsTable aggregates={ctx.aggregates} playersById={ctx.playersById} sort={sort} hrefFor={(s) => href({ view: "players", sort: s })} />
      ) : view === "leaders" ? (
        <div className="space-y-10">
          <Leaders ctx={ctx} />
          <ShameAwards awards={computeShameAwards(ctx.aggregates, ctx.completed.length, ctx.lines)} playersById={ctx.playersById} />
        </div>
      ) : (
        <GamesTable ctx={ctx} />
      )}
    </>
  );
}

type Ctx = Awaited<ReturnType<typeof getSeasonContext>>;

function Overview({ ctx }: { ctx: Ctx }) {
  const avg = teamSeasonAverages(ctx.games, ctx.lines);
  const rec = record(ctx.games);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile value={`${rec.wins}-${rec.losses}`} label={he.stats.record} sublabel="W-L" size="lg" />
        <StatTile value={formatAverage(avg.ppg)} label={he.stats.pointsFor} sublabel="PPG" size="lg" />
        <StatTile value={formatAverage(avg.oppPpg)} label={he.stats.pointsAgainst} size="lg" />
        <StatTile value={formatInt(avg.gp)} label={he.stats.gamesPlayed} sublabel="GP" size="lg" />
      </div>
      <section>
        <SectionHeader title={he.statsPage.teamAverages} />
        <TeamStatsStrip averages={avg} wins={rec.wins} />
        <div className="mt-2 grid grid-cols-3 gap-2">
          {avg.spg !== null ? <StatTile value={formatAverage(avg.spg)} label={he.stats.stealsLong} sublabel="SPG" size="sm" /> : null}
          {avg.bpg !== null ? <StatTile value={formatAverage(avg.bpg)} label={he.stats.blocksLong} sublabel="BPG" size="sm" /> : null}
          {avg.ftPct !== null ? <StatTile value={formatPercent(avg.ftPct)} label={he.stats.ftPct} sublabel="FT%" size="sm" /> : null}
        </div>
      </section>
      <Leaders ctx={ctx} limit={3} />
    </div>
  );
}

function Leaders({ ctx, limit = 5 }: { ctx: Ctx; limit?: number }) {
  const boards = computeLeaders(ctx.aggregates, ctx.completed.length, { limit });
  return (
    <section>
      <SectionHeader title={he.statsPage.leaders} />
      <p className="-mt-2 mb-3 text-xs text-muted">{he.statsPage.minGames(minGamesForLeaders(ctx.completed.length))}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((b) => (
          <LeaderCard key={b.category} board={b} playersById={ctx.playersById} />
        ))}
      </div>
    </section>
  );
}

function GamesTable({ ctx }: { ctx: Ctx }) {
  const games = [...ctx.completed].reverse();
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-max text-sm">
          <caption className="sr-only">{he.statsPage.games}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2 text-xs text-muted">
              <th scope="col" className="px-3 py-2.5 text-start font-semibold">
                {he.admin.gameForm.opponent}
              </th>
              <th scope="col" className="px-2.5 py-2.5 font-semibold">
                {he.admin.gameForm.date}
              </th>
              <th scope="col" className="px-2.5 py-2.5 font-semibold">
                {he.games.resultCol}
              </th>
              <th scope="col" className="px-2.5 py-2.5 font-semibold">
                {he.stats.rebounds}
              </th>
              <th scope="col" className="px-2.5 py-2.5 font-semibold">
                {he.stats.assists}
              </th>
              <th scope="col" className="px-2.5 py-2.5 font-semibold">
                {he.stats.fg}
              </th>
              <th scope="col" className="px-3 py-2.5 text-start font-semibold">
                {he.games.topScorer}
              </th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => {
              const lines = ctx.lines.filter((l) => l.gameId === g.id);
              const t = teamGameTotals(lines);
              const top = [...lines].sort((a, b) => b.points - a.points)[0];
              const topPlayer = top ? ctx.playersById.get(top.playerId) : undefined;
              return (
                <tr key={g.id} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="px-3 py-2.5 text-start font-semibold">
                    <Link href={`/games/${g.id}`} className="hover:text-team" data-user-content>
                      {g.opponent}
                    </Link>
                  </th>
                  <td className="num px-2.5 py-2.5 text-center text-muted">{formatShortDate(g.tipoffAt)}</td>
                  <td className="px-2.5 py-2.5 text-center">
                    <span className="inline-flex items-center gap-2">
                      <ResultBadge game={g} />
                      <bdi dir="ltr" className="num font-bold">
                        {g.teamScore}:{g.opponentScore}
                      </bdi>
                    </span>
                  </td>
                  <td className="num px-2.5 py-2.5 text-center">{t.rebounds}</td>
                  <td className="num px-2.5 py-2.5 text-center">{t.assists}</td>
                  <td className="num px-2.5 py-2.5 text-center">{formatPercent(t.fg.pct)}</td>
                  <td className="px-3 py-2.5">
                    {topPlayer && top ? (
                      <span>
                        <span data-user-content>{topPlayer.name}</span> <span className="num font-bold">{top.points}</span>
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
