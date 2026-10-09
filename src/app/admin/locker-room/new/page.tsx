import Link from "next/link";
import { PostForm } from "@/app/admin/locker-room/post-form";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/env";

export default async function NewPostPage() {
  const data = await getAdminData();
  const [players, season, awards] = await Promise.all([
    data.getPlayers({ includeInactive: true }),
    data.getActiveSeason(),
    data.getAwards(),
  ]);
  const games = season ? await data.getGames(season.id) : [];

  return (
    <div className="space-y-4">
      <Link href="/admin/locker-room" className="text-sm text-muted hover:text-text">
        {he.actions.back}
      </Link>
      <h1 className="font-display text-2xl font-bold">{he.admin.newPost}</h1>
      <PostForm players={players} games={games} awards={awards} demo={isDemoMode()} />
    </div>
  );
}
