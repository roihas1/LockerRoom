import { he } from "@/config/strings";
import { siteConfig } from "@/config/site";
import type { Game, Team } from "@/types/domain";

const GAME_DURATION_MINUTES = 150;

export interface CalendarEvent {
  uid: string;
  title: string;
  description: string;
  location: string | null;
  start: Date;
  end: Date;
  url: string;
}

export function isCalendarEligible(game: Game): boolean {
  return game.status === "scheduled" || game.status === "postponed";
}

export function gameCalendarEvent(game: Game, team: Team, siteUrl: string): CalendarEvent {
  const start = new Date(game.tipoffAt);
  const end = new Date(start.getTime() + GAME_DURATION_MINUTES * 60_000);
  const title =
    game.homeAway === "away"
      ? `${game.opponent} ${he.result.vs} ${team.name}`
      : `${team.name} ${he.result.vs} ${game.opponent}`;
  const url = `${siteUrl.replace(/\/$/, "")}/games/${game.id}`;
  const description = [game.roundNumber ? he.games.round(game.roundNumber) : null, url].filter(Boolean).join("\n");
  return { uid: `game-${game.id}@${new URL(url).host}`, title, description, location: game.location, start, end, url };
}

/** `20261028T180000Z` */
function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${utcStamp(event.start)}/${utcStamp(event.end)}`,
    details: event.description,
    ctz: siteConfig.timeZone,
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 caps content lines at 75 octets; Hebrew is multi-byte in UTF-8, so fold by bytes. */
function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LockerRoom//Games//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(event.start)}`,
    `DTEND:${utcStamp(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
