import { StatTile } from "@/components/common/stat-tile";
import { he } from "@/config/strings";
import { teamGameTotals } from "@/lib/stats/aggregate";
import { formatInt, formatPercent } from "@/lib/utils/numbers";
import type { StatLine } from "@/types/domain";

export function TeamTotals({ lines }: { lines: StatLine[] }) {
  const t = teamGameTotals(lines);
  const tiles: { value: string; label: string; sub: string; show: boolean }[] = [
    { value: formatPercent(t.fg.pct), label: he.stats.fgPct, sub: "FG%", show: t.fg.games > 0 },
    { value: formatPercent(t.three.pct), label: he.stats.threePct, sub: "3PT%", show: t.three.games > 0 },
    { value: formatPercent(t.ft.pct), label: he.stats.ftPct, sub: "FT%", show: t.ft.games > 0 },
    { value: formatInt(t.rebounds), label: he.stats.reboundsLong, sub: "REB", show: true },
    { value: formatInt(t.assists), label: he.stats.assistsLong, sub: "AST", show: true },
    { value: formatInt(t.turnovers), label: he.stats.turnoversLong, sub: "TO", show: t.turnovers !== null },
    { value: formatInt(t.steals), label: he.stats.stealsLong, sub: "STL", show: t.steals !== null },
    { value: formatInt(t.blocks), label: he.stats.blocksLong, sub: "BLK", show: t.blocks !== null },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles
        .filter((x) => x.show)
        .map((x) => (
          <StatTile key={x.sub} value={x.value} label={x.label} sublabel={x.sub} size="sm" />
        ))}
    </div>
  );
}
