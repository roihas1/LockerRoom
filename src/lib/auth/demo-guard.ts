import "server-only";
import { he } from "@/config/strings";
import { isDemoMode } from "@/lib/supabase/env";
import type { ActionResult } from "@/lib/utils/action-result";
import { actionFail } from "@/lib/utils/action-result";

/** Blocks mutations when the app runs on fixtures without Supabase. */
export function blockDemoMutation(): ActionResult | null {
  if (isDemoMode()) return actionFail(he.errors.demoMode, "demo");
  return null;
}
