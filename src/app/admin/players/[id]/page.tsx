import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerForm } from "@/app/admin/players/player-form";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/env";
import { parseId } from "@/lib/utils/params";

export default async function EditPlayerPage({ params }: PageProps<"/admin/players/[id]">) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) notFound();

  const player = await getAdminData().then((d) => d.getPlayer(id));
  if (!player) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin/players" className="text-sm text-muted hover:text-text">
        {he.actions.back}
      </Link>
      <h1 className="font-display text-2xl font-bold" data-user-content>
        {player.name}
      </h1>
      <PlayerForm player={player} demo={isDemoMode()} />
    </div>
  );
}
