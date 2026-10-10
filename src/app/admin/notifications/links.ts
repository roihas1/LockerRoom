import { he } from "@/config/strings";

/** Pages a custom notification can open. Kept to fixed public routes so a tap never lands on a 404. */
export const BROADCAST_LINKS = [
  { url: "/", label: he.admin.broadcast.links.home },
  { url: "/games", label: he.admin.broadcast.links.games },
  { url: "/locker-room", label: he.admin.broadcast.links.feed },
  { url: "/plays", label: he.admin.broadcast.links.plays },
  { url: "/stats", label: he.admin.broadcast.links.stats },
] as const;

export const BROADCAST_URLS = BROADCAST_LINKS.map((l) => l.url) as [string, ...string[]];
