import type { Metadata } from "next";
import { CoachCard } from "@/components/coaches/coach-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader, SectionHeader } from "@/components/common/section-header";
import { PlayerCard } from "@/components/players/player-card";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";

export const metadata: Metadata = { title: he.roster.title, description: he.roster.subtitle };

export default async function RosterPage() {
  const data = getData();
  const [players, coaches] = await Promise.all([data.getPlayers(), data.getCoaches()]);
  return (
    <>
      <PageHeader title={he.roster.title} subtitle={he.roster.subtitle} />
      {coaches.length ? (
        <section className="mb-8">
          <SectionHeader title={he.roster.coachesTitle} icon={<span aria-hidden>📋</span>} />
          <ul className="grid gap-3 md:grid-cols-2">
            {coaches.map((c) => (
              <li key={c.id}>
                <CoachCard coach={c} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {players.length ? (
        <section>
          {coaches.length ? <SectionHeader title={he.roster.playersTitle} icon={<span aria-hidden>🏀</span>} /> : null}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {players.map((p, i) => (
              <li key={p.id}>
                <PlayerCard player={p} priority={i < 4} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <EmptyState emoji="👥" title={he.empty.roster.title} text={he.empty.roster.text} />
      )}
    </>
  );
}
