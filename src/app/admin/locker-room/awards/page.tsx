import Link from "next/link";
import { CreatePirAwardButton } from "@/app/admin/locker-room/create-pir-award-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/env";

export default async function AdminAwardsPage() {
  const data = await getAdminData();
  const [awards, season] = await Promise.all([data.getAwards(), data.getActiveSeason()]);
  const demo = isDemoMode();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{he.admin.awards}</h1>
        <div className="flex flex-wrap items-start gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/locker-room">{he.admin.posts}</Link>
          </Button>
          {season ? <CreatePirAwardButton seasonId={season.id} demo={demo} /> : null}
          <Button asChild>
            <Link href="/admin/locker-room/awards/new">{he.admin.newAward}</Link>
          </Button>
        </div>
      </header>

      {awards.length === 0 ? (
        <p className="text-muted">{he.admin.noItems}</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {awards.map((award) => (
            <li key={award.id}>
              <Link href={`/admin/locker-room/awards/${award.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2">
                <span className="font-medium" data-user-content>
                  {award.emoji ? `${award.emoji} ` : ""}
                  {award.title}
                </span>
                <Badge tone={award.isPublished ? "win" : "neutral"}>{award.isPublished ? he.admin.published : he.admin.draft}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
