export const PUSH_TOPICS = ["games", "live", "plays", "feed"] as const;
export type PushTopic = (typeof PUSH_TOPICS)[number];

export interface PushMessage {
  title: string;
  body: string;
  /** Same-origin path opened when the notification is tapped. */
  url: string;
  /** Notifications with the same tag replace each other instead of stacking. */
  tag?: string;
}

export function vapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}
