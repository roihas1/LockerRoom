import { he } from "@/config/strings";
import { formatAverage, formatInt } from "@/lib/utils/numbers";
import type { LeaderCategory } from "./leaders";

export const leaderMeta: Record<LeaderCategory, { emoji: string; label: string; unit: string; format: (v: number) => string }> = {
  points: { emoji: "🏀", label: he.stats.pointsLong, unit: he.stats.points, format: formatAverage },
  assists: { emoji: "🎯", label: he.stats.assistsLong, unit: he.stats.assists, format: formatAverage },
  rebounds: { emoji: "🧱", label: he.stats.reboundsLong, unit: he.stats.rebounds, format: formatAverage },
  threes: { emoji: "🔥", label: he.stats.threesLong, unit: he.stats.total, format: (v) => formatInt(v) },
  steals: { emoji: "🛡", label: he.stats.stealsLong, unit: he.stats.steals, format: formatAverage },
  blocks: { emoji: "🚫", label: he.stats.blocksLong, unit: he.stats.blocks, format: formatAverage },
};
