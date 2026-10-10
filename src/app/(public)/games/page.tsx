import type { Metadata } from "next";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader, SectionHeader } from "@/components/common/section-header";
import { GameCard } from "@/components/games/game-card";
import { SeasonSelect } from "@/components/games/season-select";
import { SubscribeCalendar } from "@/components/games/subscribe-calendar";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { getSeasonContext } from "@/lib/data/season";
import { record, upcomingGames } from "@/lib/stats/games";

export const metadata: Metadata = { title: he.games.title, description: he.games.subtitle };

export default async function GamesPage({ searchParams }: PageProps<"/games">) {
  const { season: seasonParam } = await searchParams;
  const ctx = await getSeasonContext(typeof seasonParam === "string" ? seasonParam : undefined);
  const team = await getData().getTeam();
  const upcoming = upcomingGames(ctx.games);
  const done = [...ctx.completed].reverse();
  const { wins, losses } = record(ctx.games);

  return (
    <>
      <PageHeader title={he.games.title} subtitle={ctx.season ? he.home.season(ctx.season.name) : he.games.subtitle}>
        {ctx.completed.length ? (
          <p className="card px-4 py-2 text-center">
            <span className="block text-[11px] text-muted">{he.stats.record}</span>
            <bdi dir="ltr" className="num text-2xl font-black">
              {wins}-{losses}
            </bdi>
          </p>
        ) : null}
      </PageHeader>
      <SeasonSelect seasons={ctx.seasons} current={ctx.season} basePath="/games" />

      {ctx.games.length === 0 ? (
        <EmptyState emoji="🏀" title={he.empty.games.title} text={he.empty.games.text} className="mt-4" />
      ) : (
        <div className="mt-4 space-y-8">
          {upcoming.length ? (
            <section>
              <SectionHeader title={he.games.upcoming} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((g) => (
                  <GameCard key={g.id} game={g} teamShortName={team.shortName} />
                ))}
              </div>
              <SubscribeCalendar />
            </section>
          ) : null}
          <section>
            <SectionHeader title={he.games.completed} />
            {done.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {done.map((g) => (
                  <GameCard key={g.id} game={g} teamShortName={team.shortName} />
                ))}
              </div>
            ) : (
              <EmptyState emoji="⏳" title={he.empty.completedGames.title} text={he.empty.completedGames.text} />
            )}
          </section>
        </div>
      )}
    </>
  );
}
