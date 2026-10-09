import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { positionLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";

export default async function AdminPlayersPage() {
  const players = await getAdminData().then((d) => d.getPlayers({ includeInactive: true }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{he.admin.players}</h1>
        <Button asChild>
          <Link href="/admin/players/new">{he.admin.newPlayer}</Link>
        </Button>
      </header>

      {players.length === 0 ? (
        <p className="text-muted">{he.admin.noItems}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-surface-2 text-muted">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">{he.roster.jersey}</th>
                <th className="px-3 py-2 text-start font-semibold">{he.admin.playerForm.name}</th>
                <th className="px-3 py-2 text-start font-semibold">{he.admin.playerForm.position}</th>
                <th className="px-3 py-2 text-start font-semibold">{he.admin.actionsColumn}</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="num px-3 py-2">{p.jerseyNumber ?? he.stats.noValue}</td>
                  <td className="px-3 py-2" data-user-content>
                    {p.name}
                    {!p.isActive ? (
                      <Badge tone="neutral" className="ms-2">
                        {he.roster.inactive}
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{p.position ? positionLabels[p.position] : he.stats.noValue}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/players/${p.id}`} className="font-semibold text-team hover:underline">
                      {he.actions.edit}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
