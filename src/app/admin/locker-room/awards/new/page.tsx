import Link from "next/link";
import { AwardForm } from "@/app/admin/locker-room/award-form";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/env";

export default async function NewAwardPage() {
  const data = await getAdminData();
  const [seasons, players, season] = await Promise.all([
    data.getSeasons(),
    data.getPlayers({ includeInactive: true }),
    data.getActiveSeason(),
  ]);
  const games = season ? await data.getGames(season.id) : [];

  return (
    <div className="space-y-4">
      <Link href="/admin/locker-room/awards" className="text-sm text-muted hover:text-text">
        {he.actions.back}
      </Link>
      <h1 className="font-display text-2xl font-bold">{he.admin.newAward}</h1>
      <AwardForm seasons={seasons} players={players} games={games} demo={isDemoMode()} linkedToFeed={false} />
    </div>
  );
}
