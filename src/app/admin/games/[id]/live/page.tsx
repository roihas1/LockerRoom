import { notFound } from "next/navigation";
import { LiveStatsApp } from "@/components/admin/live-stats/live-stats-app";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { buildLiveGameSnapshot } from "@/lib/live-stats/initial-state";
import { isDemoMode } from "@/lib/supabase/env";
import { parseId } from "@/lib/utils/params";

export default async function AdminLiveGamePage({ params }: PageProps<"/admin/games/[id]/live">) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) notFound();

  const data = await getAdminData();
  const [game, players, lines] = await Promise.all([
    data.getGame(id),
    data.getPlayers({ includeInactive: false }),
    data.getGameLines(id),
  ]);
  if (!game) notFound();

  const snapshot = buildLiveGameSnapshot(game, lines);
  const demo = isDemoMode();

  return (
    <div className="mx-auto max-w-lg">
      <LiveStatsApp game={game} players={players} initialSnapshot={snapshot} demo={demo} />
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
