import Link from "next/link";
import { notFound } from "next/navigation";
import { EyeOff } from "lucide-react";
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
      {!game.isPublished ? (
        <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
          <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="flex-1">
            {he.live.hiddenWarning}{" "}
            <Link href={`/admin/games/${id}?step=review`} className="font-bold underline underline-offset-2">
              {he.live.publishNow}
            </Link>
          </p>
        </div>
      ) : null}
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
