"use server";

import { redirect } from "next/navigation";
import { safeAdminNext } from "@/lib/auth/safe-next";
import { he } from "@/config/strings";
import { createSessionClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/env";
import { actionFail, type ActionResult } from "@/lib/utils/action-result";
import { mapAuthError } from "@/lib/utils/errors";

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (isDemoMode()) {
    return actionFail(he.auth.demoNotice, "demo");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeAdminNext(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return actionFail(he.validation.required, "validation", { email: [he.validation.required] });
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return mapAuthError(error.message);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : null;
  if (!profile?.data || profile.data.role !== "admin") {
    await supabase.auth.signOut();
    return actionFail(he.errors.unauthorized, "unauthorized");
  }

  redirect(next);
}
