import { he } from "@/config/strings";
import { siteConfig } from "@/config/site";
import type { Game, Team } from "@/types/domain";

const GAME_DURATION_MINUTES = 150;
const REMINDER_HOUR = 9;

export interface CalendarEvent {
  uid: string;
  title: string;
  description: string;
  location: string | null;
  start: Date;
  end: Date;
  url: string;
  /** When to alert; omitted for games that are no longer upcoming. */
  alarm?: Date;
}

/** Offset of `timeZone` from UTC at `date`, in minutes (e.g. 180 for Israel summer time). */
function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

/** 09:00 local time on the day of `start`; one hour before tip-off for early games. */
export function gameDayReminder(start: Date, timeZone: string = siteConfig.timeZone): Date {
  const offset = timeZoneOffsetMinutes(start, timeZone);
  const local = new Date(start.getTime() + offset * 60_000);
  const morning = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), REMINDER_HOUR) - offset * 60_000,
  );
  return morning < start ? morning : new Date(start.getTime() - 60 * 60_000);
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
  return {
    uid: `game-${game.id}@${new URL(url).host}`,
    title,
    description,
    location: game.location,
    start,
    end,
    url,
    ...(isCalendarEligible(game) ? { alarm: gameDayReminder(start) } : {}),
  };
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

function eventLines(event: CalendarEvent, now: Date): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(event.start)}`,
    `DTEND:${utcStamp(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    `URL:${event.url}`,
    ...(event.alarm
      ? [
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          `DESCRIPTION:${escapeIcsText(event.title)}`,
          `TRIGGER;VALUE=DATE-TIME:${utcStamp(event.alarm)}`,
          "END:VALARM",
        ]
      : []),
    "END:VEVENT",
  ];
}

/** A single event, or a whole subscribable calendar when `name` is given. */
export function buildIcs(
  events: CalendarEvent | CalendarEvent[],
  now: Date = new Date(),
  name?: string,
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LockerRoom//Games//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(name
      ? [
          `X-WR-CALNAME:${escapeIcsText(name)}`,
          `X-WR-TIMEZONE:${siteConfig.timeZone}`,
          "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
          "X-PUBLISHED-TTL:PT6H",
        ]
      : []),
    ...[events].flat().flatMap((event) => eventLines(event, now)),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
