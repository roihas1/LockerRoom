import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isDemoMode } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  let email: string | null = null;
  if (!isDemoMode()) {
    const client = await createSessionClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    email = user?.email ?? null;
  }

  return <AdminShell email={email}>{children}</AdminShell>;
}
