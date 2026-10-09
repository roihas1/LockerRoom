import Link from "next/link";
import { Fragment } from "react";
import { he } from "@/config/strings";
import { teamGameTotals } from "@/lib/stats/aggregate";
import { cn } from "@/lib/utils/cn";
import { formatInt, formatSplit } from "@/lib/utils/numbers";
import type { Player, StatLine } from "@/types/domain";

type Col = {
  key: string;
  label: string;
  abbr: string;
  value: (l: StatLine) => string;
  has: (lines: StatLine[]) => boolean;
  total: (t: ReturnType<typeof teamGameTotals>) => string;
};

const always = () => true;
const anyRecorded = (k: keyof StatLine) => (lines: StatLine[]) => lines.some((l) => l[k] !== null);

const columns: Col[] = [
  { key: "pts", label: he.stats.points, abbr: "PTS", value: (l) => formatInt(l.points), has: always, total: (t) => formatInt(t.points) },
  { key: "reb", label: he.stats.rebounds, abbr: "REB", value: (l) => formatInt(l.rebounds), has: always, total: (t) => formatInt(t.rebounds) },
  { key: "ast", label: he.stats.assists, abbr: "AST", value: (l) => formatInt(l.assists), has: always, total: (t) => formatInt(t.assists) },
  { key: "stl", label: he.stats.steals, abbr: "STL", value: (l) => formatInt(l.steals), has: anyRecorded("steals"), total: (t) => formatInt(t.steals) },
  { key: "blk", label: he.stats.blocks, abbr: "BLK", value: (l) => formatInt(l.blocks), has: anyRecorded("blocks"), total: (t) => formatInt(t.blocks) },
  { key: "to", label: he.stats.turnovers, abbr: "TO", value: (l) => formatInt(l.turnovers), has: anyRecorded("turnovers"), total: (t) => formatInt(t.turnovers) },
  { key: "pf", label: he.stats.fouls, abbr: "PF", value: (l) => formatInt(l.fouls), has: anyRecorded("fouls"), total: (t) => formatInt(t.fouls) },
  {
    key: "fg",
    label: he.stats.fg,
    abbr: "FG",
    value: (l) => formatSplit(l.fgMade, l.fgAttempted),
    has: anyRecorded("fgAttempted"),
    total: (t) => formatSplit(t.fg.made, t.fg.attempted),
  },
  {
    key: "3pt",
    label: he.stats.three,
    abbr: "3PT",
    value: (l) => formatSplit(l.threeMade, l.threeAttempted),
    has: anyRecorded("threeAttempted"),
    total: (t) => formatSplit(t.three.made, t.three.attempted),
  },
  {
    key: "ft",
    label: he.stats.ft,
    abbr: "FT",
    value: (l) => formatSplit(l.ftMade, l.ftAttempted),
    has: anyRecorded("ftAttempted"),
    total: (t) => formatSplit(t.ft.made, t.ft.attempted),
  },
];

/** Horizontally scrollable box score with a sticky player column. Columns with no data are hidden. */
export function BoxScoreTable({ lines, players, potgId }: { lines: StatLine[]; players: Player[]; potgId: number | null }) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const visible = columns.filter((c) => c.has(lines));
  const totals = teamGameTotals(lines);
  const sorted = [...lines].sort((a, b) => b.points - a.points);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">{he.games.boxScore}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2 text-xs text-muted">
              <th scope="col" className="sticky start-0 z-10 bg-surface-2 px-3 py-2.5 text-start font-semibold">
                {he.games.player}
              </th>
              {visible.map((c) => (
                <th key={c.key} scope="col" className="px-2.5 py-2.5 text-center font-semibold">
                  <span className="block">{c.label}</span>
                  <span className="block text-[10px] tracking-wider opacity-70">{c.abbr}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => {
              const p = byId.get(l.playerId);
              const isPotg = l.playerId === potgId;
              return (
                <tr key={l.playerId} className="border-b border-border/60 last:border-0">
                  <th scope="row" className={cn("sticky start-0 z-10 px-3 py-2.5 text-start font-semibold", isPotg ? "bg-[color-mix(in_oklab,var(--team-primary)_12%,var(--color-surface))]" : "bg-surface")}>
                    <Link href={`/players/${l.playerId}`} className="flex items-center gap-2 hover:text-team">
                      <span className="num w-6 text-xs text-muted">{p?.jerseyNumber ?? ""}</span>
                      <span data-user-content className="max-w-32 truncate">
                        {p?.name ?? ""}
                      </span>
                      {isPotg ? <span aria-hidden>⭐</span> : null}
                    </Link>
                  </th>
                  {visible.map((c) => (
                    <td key={c.key} className={cn("num px-2.5 py-2.5 text-center", c.key === "pts" && "font-bold text-text")}>
                      <bdi dir="ltr">{c.value(l)}</bdi>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-surface-2 font-bold">
              <th scope="row" className="sticky start-0 z-10 bg-surface-2 px-3 py-2.5 text-start">
                {he.games.totals}
              </th>
              {visible.map((c) => (
                <Fragment key={c.key}>
                  <td className="num px-2.5 py-2.5 text-center">
                    <bdi dir="ltr">{c.total(totals)}</bdi>
                  </td>
                </Fragment>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      {visible.length > 4 ? <p className="border-t border-border px-3 py-2 text-[11px] text-muted md:hidden">{he.games.scrollHint}</p> : null}
    </div>
  );
}
