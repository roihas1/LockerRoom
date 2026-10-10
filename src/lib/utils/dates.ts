import { siteConfig } from "@/config/site";

const tz = siteConfig.timeZone;
const locale = siteConfig.locale;

const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: tz });
const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", year: "numeric", timeZone: tz });
const shortDateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", timeZone: tz });
const longDateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: tz });
const timeFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
const partsFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: tz,
});

export function formatWeekday(iso: string): string {
  return weekdayFmt.format(new Date(iso));
}

/** e.g. "12.11.2026" */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatShortDate(iso: string): string {
  return shortDateFmt.format(new Date(iso));
}

export function formatLongDate(iso: string): string {
  return longDateFmt.format(new Date(iso));
}

/** e.g. "20:30" */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** e.g. "יום חמישי · 20:30" */
export function formatGameMoment(iso: string): string {
  return `${formatWeekday(iso)} · ${formatTime(iso)}`;
}

function israelParts(date: Date) {
  const parts = Object.fromEntries(partsFmt.formatToParts(date).map((p) => [p.type, p.value]));
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}`,
    asUtcMs: Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(hour),
      Number(parts.minute),
      Number(parts.second),
    ),
  };
}

/** Splits an ISO timestamp into Israel-local `YYYY-MM-DD` and `HH:mm` for form inputs. */
export function toIsraelInputs(iso: string): { date: string; time: string } {
  const { date, time } = israelParts(new Date(iso));
  return { date, time };
}

/** Converts Israel-local date + time form inputs into a UTC ISO string, honoring DST. */
export function fromIsraelInputs(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if (!y || !m || !d || hh === undefined || mm === undefined || Number.isNaN(hh) || Number.isNaN(mm)) {
    throw new Error("Invalid date or time");
  }
  const naiveUtc = Date.UTC(y, m - 1, d, hh, mm);
  let guess = naiveUtc;
  for (let i = 0; i < 2; i++) {
    const offset = israelParts(new Date(guess)).asUtcMs - guess;
    guess = naiveUtc - offset;
  }
  return new Date(guess).toISOString();
}

export function todayInIsrael(): string {
  return israelParts(new Date()).date;
}

/** Calendar date (YYYY-MM-DD) of a moment in Israel time. */
export function dateInIsrael(at: Date | string | number): string {
  return israelParts(new Date(at)).date;
}
