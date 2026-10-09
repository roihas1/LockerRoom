import "server-only";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";

export type AdminSession = { userId: string | null; demo: boolean };

/** Ensures the caller is an admin. In demo mode, skips auth so the wizard can be previewed. */
export async function requireAdmin(): Promise<AdminSession> {
  if (isDemoMode()) return { userId: null, demo: true };

  const client = await createSessionClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/login?next=/admin");

  return { userId: user.id, demo: false };
}
