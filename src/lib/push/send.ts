import "server-only";
import webpush, { WebPushError } from "web-push";
import { createServiceClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/supabase/env";
import { vapidPublicKey, type PushMessage, type PushTopic } from "./topics";

const BATCH_SIZE = 20;

let configured: boolean | null = null;

function configure(): boolean {
  if (configured !== null) return configured;
  const publicKey = vapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publicKey, privateKey);
  return (configured = true);
}

export function isPushConfigured(): boolean {
  return !isDemoMode() && configure() && createServiceClient() !== null;
}

/**
 * Sends a notification to every device subscribed to `topic`. Never throws: push is a side effect and must
 * not fail the admin action that triggered it. Expired subscriptions (404/410) are removed.
 */
export async function sendPush(topic: PushTopic, message: PushMessage): Promise<{ sent: number; removed: number }> {
  const result = { sent: 0, removed: 0 };
  try {
    if (isDemoMode() || !configure()) return result;
    const client = createServiceClient();
    if (!client) return result;

    const { data: subs, error } = await client.from("push_subscriptions").select("id, endpoint, p256dh, auth").contains("topics", [topic]);
    if (error || !subs?.length) return result;

    const payload = JSON.stringify(message);
    const expired: number[] = [];
    const delivered: number[] = [];

    for (let i = 0; i < subs.length; i += BATCH_SIZE) {
      await Promise.all(
        subs.slice(i, i + BATCH_SIZE).map(async (sub) => {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, {
              TTL: 60 * 60 * 12,
              urgency: topic === "live" ? "high" : "normal",
              topic: message.tag?.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, "_"),
            });
            delivered.push(sub.id);
          } catch (err) {
            if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) expired.push(sub.id);
          }
        }),
      );
    }

    if (expired.length) await client.from("push_subscriptions").delete().in("id", expired);
    if (delivered.length) {
      await client.from("push_subscriptions").update({ last_success_at: new Date().toISOString() }).in("id", delivered);
    }
    result.sent = delivered.length;
    result.removed = expired.length;
  } catch (err) {
    console.error("sendPush failed", err);
  }
  return result;
}
