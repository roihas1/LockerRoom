import { CoachForm } from "@/app/admin/coaches/coach-form";
import { BackLink } from "@/components/common/back-link";
import { he } from "@/config/strings";
import { isDemoMode } from "@/lib/supabase/env";

export default function NewCoachPage() {
  return (
    <div className="space-y-4">
      <BackLink href="/admin/coaches" label={he.admin.coaches} />
      <h1 className="font-display text-2xl font-bold">{he.admin.newCoach}</h1>
      <CoachForm demo={isDemoMode()} />
    </div>
  );
}
