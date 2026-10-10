import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPush } from "@/lib/push/send";
import { PUSH_TOPICS } from "@/lib/push/topics";

const dispatchSchema = z.object({
  topic: z.enum(PUSH_TOPICS),
  title: z.string().min(1).max(120),
  body: z.string().max(300),
  url: z.string().startsWith("/").max(300),
  tag: z.string().max(64).optional(),
});

function authorized(request: Request): boolean {
  const expected = process.env.PUSH_DISPATCH_SECRET;
  const given = request.headers.get("x-push-secret");
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Internal endpoint for database jobs (pg_cron game reminders) to send push notifications. */
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = dispatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  const { topic, ...message } = parsed.data;
  const result = await sendPush(topic, message);
  return NextResponse.json({ ok: true, ...result });
}
