import { notFound } from "next/navigation";
import { AwardForm } from "@/app/admin/locker-room/award-form";
import { BackLink } from "@/components/common/back-link";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";
import { parseId } from "@/lib/utils/params";

async function awardLinkedToFeed(awardId: number): Promise<boolean> {
  if (isDemoMode()) {
    const feed = await getAdminData().then((d) => d.getFeed({ limit: 200 }));
    return feed.items.some((p) => p.awardId === awardId);
  }
  const client = await createSessionClient();
  const { data } = await client.from("locker_room_posts").select("id").eq("award_id", awardId).maybeSingle();
  return !!data;
}

export default async function EditAwardPage({ params }: PageProps<"/admin/locker-room/awards/[id]">) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) notFound();

  const data = await getAdminData();
  const awards = await data.getAwards();
  const award = awards.find((a) => a.id === id);
  if (!award) notFound();

  const [seasons, players, season, linkedToFeed] = await Promise.all([
    data.getSeasons(),
    data.getPlayers({ includeInactive: true }),
    data.getActiveSeason(),
    awardLinkedToFeed(id),
  ]);
  const games = season ? await data.getGames(season.id) : [];

  return (
    <div className="space-y-4">
      <BackLink href="/admin/locker-room/awards" label={he.admin.awards} />
      <h1 className="font-display text-2xl font-bold" data-user-content>
        {award.title}
      </h1>
      <AwardForm award={award} seasons={seasons} players={players} games={games} demo={isDemoMode()} linkedToFeed={linkedToFeed} />
    </div>
  );
}
