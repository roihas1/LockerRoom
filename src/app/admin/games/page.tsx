import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gameStatusLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { IbbaSyncPanel } from "@/components/admin/ibba-sync-panel";
import { getLatestIbbaSyncRun } from "@/lib/admin/ibba-sync";
import { getAdminData } from "@/lib/data";
import { formatShortDate, formatTime } from "@/lib/utils/dates";

export default async function AdminGamesPage() {
  const data = getAdminData();
  const lastIbbaRun = getLatestIbbaSyncRun();
  const [adminData, ibbaRun] = await Promise.all([data, lastIbbaRun]);
  const seasons = await adminData.getSeasons();
  const activeSeason = seasons.find((s) => s.isActive) ?? seasons[0] ?? null;
  const games = activeSeason ? await adminData.getGames(activeSeason.id) : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{he.admin.games}</h1>
          {activeSeason ? (
            <p className="text-sm text-muted" data-user-content>
              {he.home.season(activeSeason.name)}
            </p>
          ) : null}
        </div>
        <Button asChild>
          <Link href="/admin/games/new">{he.admin.newGame}</Link>
        </Button>
      </header>

      <IbbaSyncPanel lastRun={ibbaRun} />

      {games.length === 0 ? (
        <p className="text-muted">{he.admin.noItems}</p>
      ) : (
        <ul className="space-y-2">
          {games.map((g) => (
            <li key={g.id} className="card flex flex-wrap items-center justify-between gap-2 p-4">
              <Link href={`/admin/games/${g.id}?step=details`} className="min-w-0 flex-1 hover:opacity-90">
                <div>
                  <p className="font-semibold" data-user-content>
                    {he.result.vs} {g.opponent}
                  </p>
                  <p className="text-xs text-muted num">
                    {formatShortDate(g.tipoffAt)} · {formatTime(g.tipoffAt)} · {gameStatusLabels[g.status]}
                  </p>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                {g.isPublished ? (
                  <Badge tone="win">{he.admin.published}</Badge>
                ) : (
                  <Badge tone="warning">{he.admin.draft}</Badge>
                )}
                {g.status === "final" && g.teamScore != null && g.opponentScore != null ? (
                  <span className="num font-display text-lg font-bold">
                    {g.teamScore}:{g.opponentScore}
                  </span>
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/games/${g.id}/live`}>{he.admin.liveStats.title}</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
