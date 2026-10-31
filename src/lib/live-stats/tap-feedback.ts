import { he } from "@/config/strings";
import { haptic } from "@/lib/utils/haptics";
import type { LiveStatField } from "./types";

export type LiveTapKind = "points" | "opponent_points" | Exclude<LiveStatField, "points">;

/** Short Hebrew chip text for the scorer's last tap. */
export function liveTapLabel(kind: LiveTapKind, delta: number): string {
  if (delta === 0) return "";
  const sign = delta > 0 ? "+" : "−";
  const n = Math.abs(delta);
  switch (kind) {
    case "points":
      return `${sign}${n} ${he.stats.points}`;
    case "opponent_points":
      return `${sign}${n} · ${he.live.scoringOpponent}`;
    case "rebounds":
      return `${sign} ${he.stats.reboundsLong}`;
    case "assists":
      return `${sign} ${he.stats.assistsLong}`;
    case "steals":
      return `${sign} ${he.stats.stealsLong}`;
    case "blocks":
      return `${sign} ${he.stats.blocksLong}`;
    case "turnovers":
      return `${sign} ${he.stats.turnoversLong}`;
  }
}

/** Stronger buzz for bigger baskets / undos so taps feel distinct. */
export function liveTapHaptic(kind: LiveTapKind, delta: number): void {
  if (delta === 0) return;
  if (delta < 0) {
    haptic([12, 40, 12]);
    return;
  }
  if (kind === "points" || kind === "opponent_points") {
    if (delta >= 3) haptic(22);
    else if (delta === 2) haptic(16);
    else haptic(10);
    return;
  }
  haptic(10);
}
