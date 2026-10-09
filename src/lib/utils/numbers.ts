import { he } from "@/config/strings";
import { MB } from "@/config/uploads";

const oneDecimal = new Intl.NumberFormat("he-IL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });

export function formatAverage(value: number | null): string {
  return value === null ? he.stats.noValue : oneDecimal.format(value);
}

export function formatPercent(value: number | null): string {
  return value === null ? he.stats.noValue : `${integer.format(value * 100)}%`;
}

export function formatInt(value: number | null | undefined): string {
  return value === null || value === undefined ? he.stats.noValue : integer.format(value);
}

/** "5/12" style shooting split; "—" when attempts were not recorded. */
export function formatSplit(made: number | null, attempted: number | null): string {
  if (made === null || attempted === null) return he.stats.noValue;
  return `${made}/${attempted}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= MB) return `${oneDecimal.format(bytes / MB)} ${he.units.mb}`;
  if (bytes >= 1024) return `${integer.format(bytes / 1024)} ${he.units.kb}`;
  return `${integer.format(bytes)} ${he.units.bytes}`;
}
