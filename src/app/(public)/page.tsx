import { Suspense, type ReactNode } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { SectionHeader } from "@/components/common/section-header";
import { QuoteOfDay } from "@/components/fun/quote-of-day";
import { WinConfetti } from "@/components/fun/win-confetti";
import { GameCard } from "@/components/games/game-card";
import { Hero } from "@/components/home/hero";
import { LastGameCard } from "@/components/home/last-game-card";
import { NextGameCard } from "@/components/home/next-game-card";
import { HomeStandings } from "@/components/home/home-standings";
import { FeedItem } from "@/components/locker-room/feed-item";
import { PlayGrid } from "@/components/home/play-grid";
import { HotPlayerCard } from "@/components/stats/hot-player-card";
import { LeaderCard } from "@/components/stats/leader-board";
import { TeamStatsStrip } from "@/components/stats/team-stats-strip";
import { siteConfig } from "@/config/site";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { getSeasonContext } from "@/lib/data/season";
import { homeMode, type HomeMode } from "@/lib/home/mode";
import { teamSeasonAverages } from "@/lib/stats/aggregate";
import { currentStreak, gameResult, lastGame, nextGame, record } from "@/lib/stats/games";
import { computeLeaders, countPotgByPlayer } from "@/lib/stats/leaders";
import { computeHotPlayer } from "@/lib/stats/trends";

const HOME_PLAYS_LIMIT = 6;

// Rendered per request: a cached ISR page (and CDN copy) could otherwise flip between "live" and "final"
// across refreshes. Data reads stay cached (~60s) except around game time, see getSeasonContext.
export const dynamic = "force-dynamic";

type SectionKey = "games" | "standings" | "quote" | "teamStats" | "hotPlayer" | "leaders" | "plays" | "recent" | "feed";

const sectionOrder: Record<HomeMode, SectionKey[]> = {
  gameDay: ["games", "standings", "hotPlayer", "leaders", "plays", "quote", "teamStats", "recent", "feed"],
  postGame: ["games", "standings", "hotPlayer", "feed", "leaders", "quote", "teamStats", "recent", "plays"],
  default: ["quote", "games", "standings", "teamStats", "hotPlayer", "leaders", "plays", "recent", "feed"],
};

export default async function HomePage() {
  const data = getData();
  const [ctx, team, feed, plays, coaches] = await Promise.all([
    getSeasonContext(),
    data.getTeam(),
    data.getFeed({ limit: 3 }),
    data.getExercises(),
    data.getCoaches(),
  ]);
  const mode = homeMode(ctx.games);
  const rec = record(ctx.games);
  const next = nextGame(ctx.games);
  const last = lastGame(ctx.games);
  const lastLines = last ? ctx.lines.filter((l) => l.gameId === last.id) : [];
  const potg = last?.playerOfGameId ? (ctx.playersById.get(last.playerOfGameId) ?? null) : null;
  const leaders = computeLeaders(ctx.aggregates, ctx.completed.length, {
    limit: 1,
    categories: ["points", "assists", "rebounds", "pir", "potg", "threes", "blocks"],
    potgCounts: countPotgByPlayer(ctx.games),
  });
  const hot = computeHotPlayer(ctx.games, ctx.lines);
  const recent = [...ctx.completed].reverse().slice(0, siteConfig.recentGamesCount);

  const nextCard = next ? <NextGameCard game={next} team={team} /> : <EmptyState emoji="📅" title={he.empty.upcoming.title} text={he.empty.upcoming.text} />;
  const lastCard = last ? (
    <LastGameCard game={last} team={team} potg={potg} potgLine={lastLines.find((l) => l.playerId === potg?.id)} />
  ) : (
    <EmptyState emoji="🏀" title={he.empty.games.title} text={he.empty.games.text} />
  );

  const sections: Record<SectionKey, ReactNode> = {
    games:
      mode === "default" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {nextCard}
          {lastCard}
        </div>
      ) : (
        <section className="space-y-4">
          <p className="font-display text-xl font-black text-team motion-safe:animate-fade-up">
            <span aria-hidden>{mode === "gameDay" ? "🏀 " : "📣 "}</span>
            {mode === "gameDay" ? he.home.gameDay : he.home.postGame}
          </p>
          {mode === "gameDay" ? nextCard : lastCard}
          {mode === "gameDay" && last ? <div className="opacity-80">{lastCard}</div> : null}
        </section>
      ),
    standings: (
      <Suspense fallback={null}>
        <HomeStandings />
      </Suspense>
    ),
    quote: <QuoteOfDay players={[...ctx.playersById.values()]} coaches={coaches} />,
    teamStats: ctx.completed.length ? (
      <section>
        <SectionHeader title={he.home.teamStats} href="/stats" linkLabel={he.home.allStats} />
        <TeamStatsStrip averages={teamSeasonAverages(ctx.games, ctx.lines)} wins={rec.wins} />
      </section>
    ) : null,
    hotPlayer: hot ? (
      <section>
        <SectionHeader title={he.home.hotPlayer} href="/stats" linkLabel={he.home.allStats} icon={<span aria-hidden>🔥</span>} />
        <HotPlayerCard hot={hot} player={ctx.playersById.get(hot.playerId)} compact />
      </section>
    ) : null,
    leaders: leaders.length ? (
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
    ) : null,
    plays: plays.length ? (
      <section>
        <SectionHeader title={he.home.trainingPlays} href="/plays" linkLabel={he.home.allPlays} icon={<span aria-hidden>🏀</span>} />
        <PlayGrid plays={plays.slice(0, HOME_PLAYS_LIMIT)} />
      </section>
    ) : null,
    recent: recent.length ? (
      <section>
        <SectionHeader title={he.home.recentGames} href="/games" linkLabel={he.home.allGames} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((g) => (
            <GameCard key={g.id} game={g} teamShortName={team.shortName} compact />
          ))}
        </div>
      </section>
    ) : null,
    feed: feed.items.length ? (
      <section>
        <SectionHeader title={he.home.lockerRoom} href="/locker-room" linkLabel={he.home.toLockerRoom} icon={<span aria-hidden>🔥</span>} />
        <div className="grid gap-3 md:grid-cols-3">
          {feed.items.map((item) => (
            <FeedItem key={item.id} item={item} compact linked />
          ))}
        </div>
      </section>
    ) : null,
  };

  return (
    <PullToRefresh>
      <div className="space-y-10">
        <Hero team={team} season={ctx.season} record={rec} streak={currentStreak(ctx.games)} />
        {last && gameResult(last) === "win" ? <WinConfetti id={`game-${last.id}`} /> : null}
        {sectionOrder[mode].map((key) => (sections[key] ? <div key={key} className="empty:hidden">{sections[key]}</div> : null))}
      </div>
    </PullToRefresh>
  );
}

