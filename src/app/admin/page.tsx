import Link from "next/link";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { gameStatusLabels } from "@/config/labels";

export default async function AdminDashboardPage() {
  const data = await getAdminData();
  const season = await data.getActiveSeason();
  const games = season ? await data.getGames(season.id) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{he.admin.dashboard}</h1>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{he.admin.games}</h2>
          <Link href="/admin/games" className="text-sm font-semibold text-team">
            {he.home.allGames}
          </Link>
        </div>
        <ul className="divide-y divide-border rounded-(--radius-card) border border-border bg-surface">
          {games.length === 0 ? (
            <li className="p-4 text-muted">{he.admin.noItems}</li>
          ) : (
            games.map((g) => (
              <li key={g.id}>
                <Link href={`/admin/games/${g.id}?step=stats`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2">
                  <span className="font-medium">
                    {he.result.vs} {g.opponent}
                  </span>
                  <span className="text-sm text-muted">{gameStatusLabels[g.status]}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
