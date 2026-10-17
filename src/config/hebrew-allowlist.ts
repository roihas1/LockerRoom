/**
 * Latin tokens that may appear in UI text. Everything else visible to users must be Hebrew.
 * Database content (names, captions, opponents) is exempt and rendered inside [data-user-content].
 */
export const hebrewAllowlist: readonly string[] = [
  "PPG",
  "RPG",
  "APG",
  "SPG",
  "BPG",
  "TOPG",
  "FG",
  "FT",
  "3PT",
  "2PT",
  "PT",
  "MVP",
  "PTS",
  "REB",
  "AST",
  "STL",
  "BLK",
  "TO",
  "PF",
  "PIR",
  "GP",
  "VS",
  "JPEG",
  "PNG",
  "WebP",
  "MP4",
  "WebM",
  "Locker",
  "Room",
  "Google",
  "Apple",
  "Outlook",
  "Waze",
  "WhatsApp",
  "QR",
  "iPhone",
  "iOS",
  "Android",
  "Safari",
  "Chrome",
];

const allow = new Set(hebrewAllowlist.map((t) => t.toLowerCase()));

/** Returns the Latin words in `text` that are not allowlisted. */
export function findForbiddenLatin(text: string): string[] {
  const words = text.match(/[A-Za-z][A-Za-z0-9]+/g) ?? [];
  return words.filter((w) => !allow.has(w.toLowerCase()));
}

export function hasHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}
