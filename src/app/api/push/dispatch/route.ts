import { NextResponse } from "next/server";
import { z } from "zod";
import { isInternalPushAuthorized } from "@/lib/push/internal-auth";
import { sendPush } from "@/lib/push/send";
import { PUSH_TOPICS } from "@/lib/push/topics";

const dispatchSchema = z.object({
  topic: z.enum(PUSH_TOPICS),
  title: z.string().min(1).max(120),
  body: z.string().max(300),
  url: z.string().startsWith("/").max(300),
  tag: z.string().max(64).optional(),
});

/** Internal endpoint for database jobs (pg_cron game reminders) to send push notifications. */
export async function POST(request: Request) {
  if (!isInternalPushAuthorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = dispatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  const { topic, ...message } = parsed.data;
  const result = await sendPush(topic, message);
  return NextResponse.json({ ok: true, ...result });
}
