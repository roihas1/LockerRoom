import { AdminsPanel } from "@/app/admin/admins/admins-panel";
import { he } from "@/config/strings";
import { isDemoMode } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";

export default async function AdminAdminsPage() {
  const demo = isDemoMode();
  let admins: { email: string }[] = [];
  let currentEmail: string | null = null;

  if (!demo) {
    const supabase = await createSessionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentEmail = user?.email ?? null;
    const { data } = await supabase.from("profiles").select("email").eq("role", "admin").order("email");
    admins = (data ?? []).map((row) => ({ email: row.email }));
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">{he.admin.admins}</h1>
      {demo ? <p className="text-muted">{he.admin.demoBanner}</p> : null}
      <AdminsPanel admins={admins} currentEmail={currentEmail} demo={demo} />
    </div>
  );
}
