import { EmptyState } from "@/components/common/empty-state";
import { SectionHeader } from "@/components/common/section-header";
import { GameCard } from "@/components/games/game-card";
import { Hero } from "@/components/home/hero";
import { LastGameCard } from "@/components/home/last-game-card";
import { NextGameCard } from "@/components/home/next-game-card";
import { FeedItem } from "@/components/locker-room/feed-item";
import { PlayGrid } from "@/components/home/play-grid";
import { LeaderCard } from "@/components/stats/leader-board";
import { TeamStatsStrip } from "@/components/stats/team-stats-strip";
import { siteConfig } from "@/config/site";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { getSeasonContext } from "@/lib/data/season";
import { teamSeasonAverages } from "@/lib/stats/aggregate";
import { currentStreak, lastGame, nextGame, record } from "@/lib/stats/games";
import { computeLeaders } from "@/lib/stats/leaders";

const HOME_PLAYS_LIMIT = 6;

export default async function HomePage() {
  const data = getData();
  const [ctx, team, feed, plays] = await Promise.all([
    getSeasonContext(),
    data.getTeam(),
    data.getFeed({ limit: 3 }),
    data.getExercises(),
  ]);
  const rec = record(ctx.games);
  const next = nextGame(ctx.games);
  const last = lastGame(ctx.games);
  const lastLines = last ? ctx.lines.filter((l) => l.gameId === last.id) : [];
  const potg = last?.playerOfGameId ? (ctx.playersById.get(last.playerOfGameId) ?? null) : null;
  const leaders = computeLeaders(ctx.aggregates, ctx.completed.length, { limit: 1, categories: ["points", "assists", "rebounds", "threes", "blocks"] });
  const recent = [...ctx.completed].reverse().slice(0, siteConfig.recentGamesCount);

  return (
    <div className="space-y-10">
      <Hero team={team} season={ctx.season} record={rec} streak={currentStreak(ctx.games)} />

      <div className="grid gap-4 md:grid-cols-2">
        {next ? <NextGameCard game={next} team={team} /> : <EmptyState emoji="📅" title={he.empty.upcoming.title} text={he.empty.upcoming.text} />}
        {last ? (
          <LastGameCard game={last} team={team} potg={potg} potgLine={lastLines.find((l) => l.playerId === potg?.id)} />
        ) : (
          <EmptyState emoji="🏀" title={he.empty.games.title} text={he.empty.games.text} />
        )}
      </div>

      {ctx.completed.length ? (
        <section>
          <SectionHeader title={he.home.teamStats} href="/stats" linkLabel={he.home.allStats} />
          <TeamStatsStrip averages={teamSeasonAverages(ctx.games, ctx.lines)} wins={rec.wins} />
        </section>
      ) : null}

      {leaders.length ? (
        <section>
          <SectionHeader title={he.home.leaders} href="/stats?view=leaders" linkLabel={he.home.allStats} />
          <div className="flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-none md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-5">
            {leaders.map((b) => (
              <div key={b.category} className="w-64 shrink-0 snap-start md:w-auto">
                <LeaderCard board={b} playersById={ctx.playersById} compact />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {plays.length ? (
        <section>
          <SectionHeader
            title={he.home.trainingPlays}
            href="/plays"
            linkLabel={he.home.allPlays}
            icon={<span aria-hidden>🏀</span>}
          />
          <PlayGrid plays={plays.slice(0, HOME_PLAYS_LIMIT)} />
        </section>
      ) : null}

      {recent.length ? (
        <section>
          <SectionHeader title={he.home.recentGames} href="/games" linkLabel={he.home.allGames} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((g) => (
              <GameCard key={g.id} game={g} teamShortName={team.shortName} compact />
            ))}
          </div>
        </section>
      ) : null}

      {feed.items.length ? (
        <section>
          <SectionHeader title={he.home.lockerRoom} href="/locker-room" linkLabel={he.home.toLockerRoom} icon={<span aria-hidden>🔥</span>} />
          <div className="grid gap-3 md:grid-cols-3">
            {feed.items.map((item) => (
              <FeedItem key={item.id} item={item} compact />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
