import { he } from "@/config/strings";

export interface BirthdayCandidate {
  playerId: number;
  name: string;
  nickname: string | null;
  birthDate: string; // YYYY-MM-DD
}

export interface BirthdayPushCopy {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** Stable 0..n-1 pick from a seed string. */
export function pickVariantIndex(seed: string, count: number): number {
  if (count <= 1) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % count;
}

/** Jerusalem calendar YYYY-MM-DD for an instant (defaults to now). */
export function jerusalemDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function parseYmd(ymd: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** True when `birthDate` (YYYY-MM-DD) is a birthday on the Jerusalem calendar day `todayKey`. */
export function isBirthdayOn(birthDate: string, todayKey: string): boolean {
  const birth = parseYmd(birthDate);
  const today = parseYmd(todayKey);
  if (!birth || !today) return false;
  if (birth.month === today.month && birth.day === today.day) return true;
  // Feb 29 → celebrate on March 1 in non-leap years.
  if (birth.month === 2 && birth.day === 29 && today.month === 3 && today.day === 1 && !isLeapYear(today.year)) {
    return true;
  }
  return false;
}

export function displayName(player: Pick<BirthdayCandidate, "name" | "nickname">): string {
  return player.nickname?.trim() || player.name.split(/\s+/)[0] || player.name;
}

/** Funny push copy for one birthday. Deterministic for the same player + year. */
export function birthdayPushCopy(player: BirthdayCandidate, todayKey: string): BirthdayPushCopy {
  const year = todayKey.slice(0, 4);
  const override = he.push.birthday.overrides[player.playerId];
  if (override) {
    return {
      title: override.title,
      body: override.body,
      url: `/players/${player.playerId}`,
      tag: `birthday-${player.playerId}-${year}`,
    };
  }

  const name = displayName(player);
  const seed = `${player.playerId}:${year}`;
  const titles = he.push.birthday.titles;
  const bodies = he.push.birthday.bodies;
  return {
    title: titles[pickVariantIndex(`${seed}:t`, titles.length)]!(name),
    body: bodies[pickVariantIndex(`${seed}:b`, bodies.length)]!(name),
    url: `/players/${player.playerId}`,
    tag: `birthday-${player.playerId}-${year}`,
  };
}

export function filterBirthdayCandidates(
  players: BirthdayCandidate[],
  todayKey: string,
  alreadySentOn: Map<number, string | null>,
): BirthdayCandidate[] {
  return players.filter((p) => {
    if (!isBirthdayOn(p.birthDate, todayKey)) return false;
    const sent = alreadySentOn.get(p.playerId);
    return sent !== todayKey;
  });
}
