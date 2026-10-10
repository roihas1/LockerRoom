"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { he } from "@/config/strings";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isPushConfigured, sendPush } from "@/lib/push/send";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { BROADCAST_URLS } from "./links";

const broadcastSchema = z.object({
  title: z.string().trim().min(1, he.validation.required).max(120, he.validation.tooLong(120)),
  body: z.string().trim().max(300, he.validation.tooLong(300)),
  url: z.enum(BROADCAST_URLS, he.validation.invalidOption),
});

export async function sendBroadcastAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { userId } = await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;
  if (!isPushConfigured()) return actionFail(he.admin.broadcast.notConfigured, "push_unavailable");

  const parsed = broadcastSchema.safeParse({
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
    url: formData.get("url") ?? "/",
  });
  if (!parsed.success) return actionFromZod(parsed.error);

  return deliver(parsed.data, userId);
}

export async function resendBroadcastAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { userId } = await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;
  if (!isPushConfigured()) return actionFail(he.admin.broadcast.notConfigured, "push_unavailable");

  const id = Number(formData.get("broadcastId"));
  if (!Number.isInteger(id) || id <= 0) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { data: original } = await supabase.from("push_broadcasts").select("title, body, url").eq("id", id).maybeSingle();
  if (!original) return actionFail(he.errors.notFound, "not_found");

  return deliver(original, userId);
}

async function deliver(message: { title: string; body: string; url: string }, userId: string | null): Promise<ActionResult> {
  const { title, body, url } = message;
  const { sent } = await sendPush("all", { title, body, url, tag: `broadcast-${Date.now()}` });

  const supabase = await createSessionClient();
  await supabase.from("push_broadcasts").insert({ title, body, url, sent_count: sent, created_by: userId });
  revalidatePath("/admin/notifications");

  return sent > 0 ? actionSuccess(he.admin.broadcast.sent(sent)) : actionFail(he.admin.broadcast.sentNone, "push_none");
}
