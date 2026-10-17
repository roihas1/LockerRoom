import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { he } from "@/config/strings";
import type { PlayerAggregate } from "@/lib/stats/aggregate";
import { compareDesc } from "@/lib/stats/sort-value";
import { cn } from "@/lib/utils/cn";
import { formatAverage, formatInt, formatPercent } from "@/lib/utils/numbers";
import type { Player } from "@/types/domain";

export const sortKeys = ["player", "gp", "ppg", "rpg", "apg", "spg", "bpg", "topg", "fg", "three", "ft", "pir"] as const;
export type SortKey = (typeof sortKeys)[number];

interface Col {
  key: Exclude<SortKey, "player">;
  label: string;
  abbr: string;
  value: (a: PlayerAggregate) => number | null;
  format: (v: number | null) => string;
  has: (all: PlayerAggregate[]) => boolean;
}

const yes = () => true;
const cols: Col[] = [
  { key: "gp", label: he.stats.gamesPlayed, abbr: "GP", value: (a) => a.gp, format: formatInt, has: yes },
  { key: "ppg", label: he.stats.points, abbr: "PPG", value: (a) => a.ppg, format: formatAverage, has: yes },
  { key: "rpg", label: he.stats.rebounds, abbr: "RPG", value: (a) => a.rpg, format: formatAverage, has: yes },
  { key: "apg", label: he.stats.assists, abbr: "APG", value: (a) => a.apg, format: formatAverage, has: yes },
  { key: "spg", label: he.stats.steals, abbr: "SPG", value: (a) => a.steals.perGame, format: formatAverage, has: (all) => all.some((a) => a.steals.games > 0) },
  { key: "bpg", label: he.stats.blocks, abbr: "BPG", value: (a) => a.blocks.perGame, format: formatAverage, has: (all) => all.some((a) => a.blocks.games > 0) },
  { key: "topg", label: he.stats.turnovers, abbr: "TOPG", value: (a) => a.turnovers.perGame, format: formatAverage, has: (all) => all.some((a) => a.turnovers.games > 0) },
  { key: "fg", label: he.stats.fg, abbr: "FG%", value: (a) => a.fg.pct, format: formatPercent, has: (all) => all.some((a) => a.fg.attempted > 0) },
  { key: "three", label: he.stats.three, abbr: "3PT%", value: (a) => a.three.pct, format: formatPercent, has: (all) => all.some((a) => a.three.attempted > 0) },
  { key: "ft", label: he.stats.ft, abbr: "FT%", value: (a) => a.ft.pct, format: formatPercent, has: (all) => all.some((a) => a.ft.attempted > 0) },
  { key: "pir", label: he.stats.pir, abbr: "PIR", value: (a) => a.pirPerGame, format: formatAverage, has: yes },
];

export function PlayersStatsTable({
  aggregates,
  playersById,
  sort,
  hrefFor,
}: {
  aggregates: PlayerAggregate[];
  playersById: Map<number, Player>;
  sort: SortKey;
  hrefFor: (sort: SortKey) => string;
}) {
  const visible = cols.filter((c) => c.has(aggregates));
  const sortCol = sort === "player" ? null : (visible.find((c) => c.key === sort) ?? visible.find((c) => c.key === "pir")!);
  const activeKey: SortKey = sort === "player" ? "player" : (sortCol?.key ?? "pir");
  const rows = [...aggregates].sort((a, b) => {
    if (activeKey === "player") {
      const an = playersById.get(a.playerId)?.name ?? "";
      const bn = playersById.get(b.playerId)?.name ?? "";
      return an.localeCompare(bn, "he") || a.playerId - b.playerId;
    }
    return compareDesc(sortCol!.value(a), sortCol!.value(b)) || a.playerId - b.playerId;
  });

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">{he.statsPage.players}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2 text-xs text-muted">
              <th scope="col" aria-sort={activeKey === "player" ? "ascending" : "none"} className="sticky start-0 z-10 bg-surface-2 p-0 text-start font-semibold">
                <Link
                  href={hrefFor("player")}
                  scroll={false}
                  className={cn("flex flex-col items-start px-3 py-2.5 hover:text-text", activeKey === "player" && "text-team")}
                  aria-label={`${he.statsPage.sortBy} ${he.games.player}`}
                >
                  <span className="flex items-center gap-0.5">
                    {he.games.player}
                    {activeKey === "player" ? <ArrowDown className="size-3" aria-hidden /> : null}
                  </span>
                </Link>
              </th>
              {visible.map((c) => {
                const active = c.key === activeKey;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? "descending" : "none"} className="p-0 text-center font-semibold">
                    <Link
                      href={hrefFor(c.key)}
                      scroll={false}
                      className={cn("flex flex-col items-center px-2.5 py-2.5 hover:text-text", active && "text-team")}
                      aria-label={`${he.statsPage.sortBy} ${c.label}`}
                    >
                      <span className="flex items-center gap-0.5">
                        {c.label}
                        {active ? <ArrowDown className="size-3" aria-hidden /> : null}
                      </span>
                      <span className="text-[10px] tracking-wider opacity-70">{c.abbr}</span>
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const p = playersById.get(a.playerId);
              return (
                <tr key={a.playerId} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="sticky start-0 z-10 bg-surface px-3 py-2.5 text-start font-semibold">
                    <Link href={`/players/${a.playerId}`} className="flex items-center gap-2 hover:text-team">
                      <span className="num w-6 text-xs text-muted">{p?.jerseyNumber}</span>
                      <span data-user-content className="max-w-36 truncate">
                        {p?.name}
                      </span>
                    </Link>
                  </th>
                  {visible.map((c) => (
                    <td key={c.key} className={cn("num px-2.5 py-2.5 text-center", c.key === activeKey && "font-bold text-team")}>
                      <bdi dir="ltr">{c.format(c.value(a))}</bdi>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
