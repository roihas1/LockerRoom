import { ClicheModerationList } from "@/app/admin/cliches/cliche-moderation-list";
import { he } from "@/config/strings";
import type { CupCliche } from "@/lib/fun/cliches";
import { isDemoMode } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";

export default async function AdminClichesPage() {
  const demo = isDemoMode();
  let items: CupCliche[] = [];

  if (!demo) {
    const supabase = await createSessionClient();
    const { data } = await supabase
      .from("cup_cliches")
      .select("id, body, said_by, weight, verified, created_at, status")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    items =
      data?.map((row) => ({
        id: row.id,
        body: row.body,
        saidBy: row.said_by,
        weight: row.weight,
        verified: row.verified,
        status: row.status,
        createdAt: row.created_at,
      })) ?? [];
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{he.admin.clicheModeration.title}</h1>
      <ClicheModerationList items={items} demo={demo} />
    </div>
  );
}
