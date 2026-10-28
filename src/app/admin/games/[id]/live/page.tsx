import Link from "next/link";
import { notFound } from "next/navigation";
import { EyeOff } from "lucide-react";
import { LiveStatsApp } from "@/components/admin/live-stats/live-stats-app";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { getStatsEntryDefaults } from "@/lib/admin/lineup";
import { buildLiveGameSnapshot } from "@/lib/live-stats/initial-state";
import { isDemoMode } from "@/lib/supabase/env";
import { parseId } from "@/lib/utils/params";

export default async function AdminLiveGamePage({ params }: PageProps<"/admin/games/[id]/live">) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) notFound();

  const data = await getAdminData();
  const [game, players, lines, team] = await Promise.all([
    data.getGame(id),
    data.getPlayers({ includeInactive: false }),
    data.getGameLines(id),
    data.getTeam(),
  ]);
  if (!game) notFound();

  const snapshot = buildLiveGameSnapshot(game, lines);
  const demo = isDemoMode();

  // Only needed to pre-fill the lineup of a game that has not started: last game's roster, active players only.
  let suggestedPlayerIds: number[] = [];
  if (game.status !== "live" && game.status !== "final" && lines.length === 0) {
    const defaults = await getStatsEntryDefaults(data, game);
    const active = new Set(players.map((p) => p.id));
    suggestedPlayerIds = defaults.playedIds.filter((playerId) => active.has(playerId));
  }

  const hiddenNotice = !game.isPublished ? (
    <div role="status" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs text-warning">
      <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <p className="flex-1">
        {he.live.hiddenWarning}{" "}
        <Link href={`/admin/games/${id}?step=review`} className="font-bold underline underline-offset-2">
          {he.live.publishNow}
        </Link>
      </p>
    </div>
  ) : null;

  // Scorer mode: the screen covers the admin header and navigation so the whole phone is left for the controls
  // (scoreboard, players and every stat visible without scrolling). The back arrow in the scoreboard leaves it.
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-bg">
      <div className="mx-auto max-w-lg px-4 pb-28">
        <LiveStatsApp
          game={game}
          players={players}
          initialSnapshot={snapshot}
          teamName={team.name}
          suggestedPlayerIds={suggestedPlayerIds}
          notice={hiddenNotice}
          demo={demo}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps<"/admin/games/[id]/live">) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return { title: he.admin.liveStats.title };
  const data = await getAdminData();
  const game = await data.getGame(id);
  if (!game) return { title: he.admin.liveStats.title };
  return {
    title: `${he.admin.liveStats.title} · ${he.result.vs} ${game.opponent}`,
  };
}
