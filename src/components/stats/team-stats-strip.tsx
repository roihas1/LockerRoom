import { StatTile } from "@/components/common/stat-tile";
import { he } from "@/config/strings";
import type { TeamSeasonAverages } from "@/lib/stats/aggregate";
import { formatAverage, formatInt, formatPercent } from "@/lib/utils/numbers";

export function TeamStatsStrip({ averages, wins }: { averages: TeamSeasonAverages; wins: number }) {
  const tiles = [
    { value: formatAverage(averages.ppg), label: he.stats.pointsLong, sub: "PPG", show: true },
    { value: formatAverage(averages.rpg), label: he.stats.reboundsLong, sub: "RPG", show: true },
    { value: formatAverage(averages.apg), label: he.stats.assistsLong, sub: "APG", show: true },
    { value: formatPercent(averages.threePct), label: he.stats.threePct, sub: "3PT%", show: averages.threePct !== null },
    { value: formatPercent(averages.fgPct), label: he.stats.fgPct, sub: "FG%", show: averages.fgPct !== null },
    { value: formatInt(wins), label: he.stats.wins, sub: "W", show: true },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
      {tiles
        .filter((t) => t.show)
        .map((t) => (
          <StatTile key={t.sub} value={t.value} label={t.label} sublabel={t.sub} />
        ))}
    </div>
  );
}
