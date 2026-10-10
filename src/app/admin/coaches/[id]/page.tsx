import { notFound } from "next/navigation";
import { CoachForm } from "@/app/admin/coaches/coach-form";
import { BackLink } from "@/components/common/back-link";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/env";
import { parseId } from "@/lib/utils/params";

export default async function EditCoachPage({ params }: PageProps<"/admin/coaches/[id]">) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) notFound();

  const coach = await getAdminData().then((d) => d.getCoach(id));
  if (!coach) notFound();

  return (
    <div className="space-y-4">
      <BackLink href="/admin/coaches" label={he.admin.coaches} />
      <h1 className="font-display text-2xl font-bold" data-user-content>
        {coach.name}
      </h1>
      <CoachForm coach={coach} demo={isDemoMode()} />
    </div>
  );
}
