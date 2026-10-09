import type { Metadata } from "next";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/section-header";
import { PlayerCard } from "@/components/players/player-card";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";

export const metadata: Metadata = { title: he.roster.title, description: he.roster.subtitle };

export default async function RosterPage() {
  const players = await getData().getPlayers();
  return (
    <>
      <PageHeader title={he.roster.title} subtitle={he.roster.subtitle} />
      {players.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {players.map((p, i) => (
            <li key={p.id}>
              <PlayerCard player={p} priority={i < 4} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState emoji="👥" title={he.empty.roster.title} text={he.empty.roster.text} />
      )}
    </>
  );
}
