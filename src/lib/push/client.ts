import type { PushSubscribeResult } from "@/app/api/push/subscribe/route";
import { PUSH_TOPICS, vapidPublicKey, type PushTopic } from "./topics";

const TOPICS_KEY = "lr:push-topics";

export type Platform = "ios" | "android" | "other";

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  if (/iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function readTopics(): PushTopic[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TOPICS_KEY) ?? "null");
    if (Array.isArray(raw)) return raw.filter((t): t is PushTopic => (PUSH_TOPICS as readonly string[]).includes(t));
  } catch {}
  return [...PUSH_TOPICS];
}

function writeTopics(topics: PushTopic[]) {
  localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  } catch {
    return null;
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function saveOnServer(sub: PushSubscription, topics: PushTopic[]): Promise<PushSubscribeResult> {
  const json = sub.toJSON();
  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, topics }),
    });
    return (await res.json()) as PushSubscribeResult;
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export type EnableResult = { ok: true } | { ok: false; reason: "unsupported" | "denied" | "unavailable" | "failed" | "demo" };

/** Must be called from a user gesture (iOS requires it for the permission prompt). */
export async function enablePush(topics: PushTopic[]): Promise<EnableResult> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  const key = vapidPublicKey();
  if (!key) return { ok: false, reason: "unavailable" };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };
  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  try {
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
    const saved = await saveOnServer(sub, topics);
    if (!saved.ok) {
      if (saved.reason === "demo") return { ok: false, reason: "demo" };
      return { ok: false, reason: saved.reason === "unavailable" ? "unavailable" : "failed" };
    }
    writeTopics(topics);
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function updateTopics(topics: PushTopic[]): Promise<boolean> {
  writeTopics(topics);
  const sub = await currentSubscription();
  if (!sub) return false;
  return (await saveOnServer(sub, topics)).ok;
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => false);
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => null);
}

export type PushState = "loading" | "unsupported" | "needs-install" | "unavailable" | "blocked" | "off" | "on";

export async function detectPushState(): Promise<PushState> {
  if (!vapidPublicKey()) return "unavailable";
  if (detectPlatform() === "ios" && !isStandalone()) return "needs-install";
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return (await currentSubscription()) && Notification.permission === "granted" ? "on" : "off";
}

/** Lets every notification widget on the page re-check after one of them changes the subscription. */
export const PUSH_CHANGE_EVENT = "lr:push-change";

export function announcePushChange() {
  window.dispatchEvent(new Event(PUSH_CHANGE_EVENT));
}
