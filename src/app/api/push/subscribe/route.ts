import { NextResponse } from "next/server";
import { z } from "zod";
import { PUSH_TOPICS } from "@/lib/push/topics";
import { createServiceClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/supabase/env";

export type PushSubscribeResult = { ok: true } | { ok: false; reason: "demo" | "invalid" | "unavailable" | "failed" };

/** The server POSTs to whatever endpoint is stored, so only accept the browsers' real push services. */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];

const endpointSchema = z
  .url()
  .max(1024)
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(url.hostname));
  });

const subscribeSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(128) }),
  topics: z.array(z.enum(PUSH_TOPICS)).max(PUSH_TOPICS.length),
});

const unsubscribeSchema = z.object({ endpoint: endpointSchema });

function reply(body: PushSubscribeResult, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  if (isDemoMode()) return reply({ ok: false, reason: "demo" });
  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ ok: false, reason: "invalid" }, 400);
  const client = createServiceClient();
  if (!client) return reply({ ok: false, reason: "unavailable" }, 503);

  const { endpoint, keys, topics } = parsed.data;
  const { error } = await client.from("push_subscriptions").upsert(
    {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      topics: [...new Set(topics)],
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) return reply({ ok: false, reason: "failed" }, 500);
  return reply({ ok: true });
}

export async function DELETE(request: Request) {
  if (isDemoMode()) return reply({ ok: false, reason: "demo" });
  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ ok: false, reason: "invalid" }, 400);
  const client = createServiceClient();
  if (!client) return reply({ ok: false, reason: "unavailable" }, 503);

  const { error } = await client.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  if (error) return reply({ ok: false, reason: "failed" }, 500);
  return reply({ ok: true });
}
