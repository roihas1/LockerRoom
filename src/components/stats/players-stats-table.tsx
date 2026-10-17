"use client";

import Link from "next/link";
import { useState } from "react";
import { SortableTh } from "@/components/stats/sortable-th";
import { he } from "@/config/strings";
import type { PlayerAggregate } from "@/lib/stats/aggregate";
import { compareNum, compareText, toggleSortDir, type SortDir } from "@/lib/stats/sort-value";
import { cn } from "@/lib/utils/cn";
import { formatAverage, formatInt, formatPercent } from "@/lib/utils/numbers";
import type { Player } from "@/types/domain";

type SortKey = "player" | "gp" | "ppg" | "rpg" | "apg" | "spg" | "bpg" | "topg" | "fg" | "three" | "ft" | "pir";

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
  { key: "spg", label: he.stats.steals, abbr: "SPG", value: (a) => a.steals.perGame, format: formatAverage, has: yes },
  { key: "bpg", label: he.stats.blocks, abbr: "BPG", value: (a) => a.blocks.perGame, format: formatAverage, has: yes },
  { key: "topg", label: he.stats.turnovers, abbr: "TOPG", value: (a) => a.turnovers.perGame, format: formatAverage, has: yes },
  { key: "fg", label: he.stats.fg, abbr: "FG%", value: (a) => a.fg.pct, format: formatPercent, has: (all) => all.some((a) => a.fg.attempted > 0) },
  { key: "three", label: he.stats.three, abbr: "3PT%", value: (a) => a.three.pct, format: formatPercent, has: (all) => all.some((a) => a.three.attempted > 0) },
  { key: "ft", label: he.stats.ft, abbr: "FT%", value: (a) => a.ft.pct, format: formatPercent, has: (all) => all.some((a) => a.ft.attempted > 0) },
  { key: "pir", label: he.stats.pir, abbr: "PIR", value: (a) => a.pirPerGame, format: formatAverage, has: yes },
];

/** Season player averages — client sort so header taps do not remount the page. */
export function PlayersStatsTable({
  aggregates,
  players,
}: {
  aggregates: PlayerAggregate[];
  players: Player[];
}) {
  const [sort, setSort] = useState<SortKey>("pir");
  const [dir, setDir] = useState<SortDir>("desc");
  const playersById = new Map(players.map((p) => [p.id, p]));
  const visible = cols.filter((c) => c.has(aggregates));
  const onSort = (key: SortKey) => {
    if (key === sort) setDir(toggleSortDir);
    else {
      setSort(key);
      setDir(key === "player" ? "asc" : "desc");
    }
  };
  const sortCol = sort === "player" ? null : (visible.find((c) => c.key === sort) ?? visible.find((c) => c.key === "pir")!);
  const activeKey: SortKey = sort === "player" ? "player" : (sortCol?.key ?? "pir");
  const rows = [...aggregates].sort((a, b) => {
    if (activeKey === "player") {
      const an = playersById.get(a.playerId)?.name ?? "";
      const bn = playersById.get(b.playerId)?.name ?? "";
      return compareText(an, bn, dir) || a.playerId - b.playerId;
    }
    return compareNum(sortCol!.value(a), sortCol!.value(b), dir) || a.playerId - b.playerId;
  });

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">{he.statsPage.players}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2 text-xs text-muted">
              <SortableTh label={he.games.player} active={activeKey === "player"} dir={dir} onSort={() => onSort("player")} align="start" sticky />
              {visible.map((c) => (
                <SortableTh key={c.key} label={c.label} abbr={c.abbr} active={activeKey === c.key} dir={dir} onSort={() => onSort(c.key)} />
              ))}
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
