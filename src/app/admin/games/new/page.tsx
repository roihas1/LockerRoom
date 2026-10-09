import Link from "next/link";
import { GameDetailsForm } from "@/app/admin/games/game-details-form";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/env";

export default async function NewGamePage() {
  const data = await getAdminData();
  const seasons = await data.getSeasons();
  const active = seasons.find((s) => s.isActive) ?? seasons[0];

  return (
    <div className="space-y-4">
      <Link href="/admin/games" className="text-sm text-muted hover:text-text">
        {he.actions.back}
      </Link>
      <h1 className="font-display text-2xl font-bold">{he.admin.newGame}</h1>
      {active ? (
        <GameDetailsForm seasons={seasons} defaultSeasonId={active.id} demo={isDemoMode()} />
      ) : (
        <p className="text-muted">{he.admin.noItems}</p>
      )}
    </div>
  );
}
