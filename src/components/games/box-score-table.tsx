"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { SortableTh } from "@/components/stats/sortable-th";
import { he } from "@/config/strings";
import { teamGameTotals } from "@/lib/stats/aggregate";
import { computePir } from "@/lib/stats/pir";
import {
  emptyScoring,
  hasScoring,
  playerScoringFromEvents,
  scoringTotal,
  type ScoringFromEvents,
} from "@/lib/stats/scoring-from-events";
import { compareDesc, splitSortValue } from "@/lib/stats/sort-value";
import { cn } from "@/lib/utils/cn";
import { formatInt, formatSplit } from "@/lib/utils/numbers";
import type { GameEvent, Player, StatLine } from "@/types/domain";

type ColKey = "player" | "pts" | "reb" | "ast" | "stl" | "blk" | "to" | "pir" | "pf" | "fg" | "3pt" | "ft" | "twoEvt" | "threeEvt" | "ftEvt";

type Col = {
  key: Exclude<ColKey, "player">;
  label: string;
  abbr: string;
  value: (l: StatLine, scoring: ScoringFromEvents) => string;
  sortValue: (l: StatLine, scoring: ScoringFromEvents) => number;
  has: (lines: StatLine[], fromEvents: boolean) => boolean;
  total: (t: ReturnType<typeof teamGameTotals>, eventTotals: ScoringFromEvents) => string;
};

const always = () => true;
const anyRecorded = (k: keyof StatLine) => (lines: StatLine[]) => lines.some((l) => l[k] !== null);
/** Manual made/attempted splits — hidden when play-by-play already supplies made FT/2/3. */
const manualShooting =
  (k: keyof StatLine) =>
  (lines: StatLine[], fromEvents: boolean): boolean =>
    !fromEvents && anyRecorded(k)(lines);
const fromEventsOnly = (_lines: StatLine[], fromEvents: boolean) => fromEvents;

const columns: Col[] = [
  { key: "pts", label: he.stats.points, abbr: "PTS", value: (l) => formatInt(l.points), sortValue: (l) => l.points, has: always, total: (t) => formatInt(t.points) },
  { key: "reb", label: he.stats.rebounds, abbr: "REB", value: (l) => formatInt(l.rebounds), sortValue: (l) => l.rebounds, has: always, total: (t) => formatInt(t.rebounds) },
  { key: "ast", label: he.stats.assists, abbr: "AST", value: (l) => formatInt(l.assists), sortValue: (l) => l.assists, has: always, total: (t) => formatInt(t.assists) },
  { key: "stl", label: he.stats.steals, abbr: "STL", value: (l) => formatInt(l.steals), sortValue: (l) => l.steals ?? Number.NEGATIVE_INFINITY, has: anyRecorded("steals"), total: (t) => formatInt(t.steals) },
  { key: "blk", label: he.stats.blocks, abbr: "BLK", value: (l) => formatInt(l.blocks), sortValue: (l) => l.blocks ?? Number.NEGATIVE_INFINITY, has: anyRecorded("blocks"), total: (t) => formatInt(t.blocks) },
  { key: "to", label: he.stats.turnovers, abbr: "TO", value: (l) => formatInt(l.turnovers), sortValue: (l) => l.turnovers ?? Number.NEGATIVE_INFINITY, has: anyRecorded("turnovers"), total: (t) => formatInt(t.turnovers) },
  { key: "pir", label: he.stats.pir, abbr: "PIR", value: (l) => formatInt(computePir(l)), sortValue: (l) => computePir(l), has: always, total: (t) => formatInt(t.pir) },
  { key: "pf", label: he.stats.fouls, abbr: "PF", value: (l) => formatInt(l.fouls), sortValue: (l) => l.fouls ?? Number.NEGATIVE_INFINITY, has: anyRecorded("fouls"), total: (t) => formatInt(t.fouls) },
  {
    key: "twoEvt",
    label: he.live.twos,
    abbr: he.live.twosAbbr,
    value: (_l, s) => formatInt(s.two),
    sortValue: (_l, s) => s.two,
    has: fromEventsOnly,
    total: (_t, e) => formatInt(e.two),
  },
  {
    key: "threeEvt",
    label: he.stats.three,
    abbr: "3PT",
    value: (_l, s) => formatInt(s.three),
    sortValue: (_l, s) => s.three,
    has: fromEventsOnly,
    total: (_t, e) => formatInt(e.three),
  },
  {
    key: "ftEvt",
    label: he.stats.ft,
    abbr: "FT",
    value: (_l, s) => formatInt(s.ft),
    sortValue: (_l, s) => s.ft,
    has: fromEventsOnly,
    total: (_t, e) => formatInt(e.ft),
  },
  {
    key: "fg",
    label: he.stats.fg,
    abbr: "FG",
    value: (l) => formatSplit(l.fgMade, l.fgAttempted),
    sortValue: (l) => splitSortValue(l.fgMade, l.fgAttempted),
    has: manualShooting("fgAttempted"),
    total: (t) => formatSplit(t.fg.made, t.fg.attempted),
  },
  {
    key: "3pt",
    label: he.stats.three,
    abbr: "3PT",
    value: (l) => formatSplit(l.threeMade, l.threeAttempted),
    sortValue: (l) => splitSortValue(l.threeMade, l.threeAttempted),
    has: manualShooting("threeAttempted"),
    total: (t) => formatSplit(t.three.made, t.three.attempted),
  },
  {
    key: "ft",
    label: he.stats.ft,
    abbr: "FT",
    value: (l) => formatSplit(l.ftMade, l.ftAttempted),
    sortValue: (l) => splitSortValue(l.ftMade, l.ftAttempted),
    has: manualShooting("ftAttempted"),
    total: (t) => formatSplit(t.ft.made, t.ft.attempted),
  },
];

/** Horizontally scrollable box score with a sticky player column. Columns with no data are hidden. */
export function BoxScoreTable({
  lines,
  players,
  potgId,
  events,
}: {
  lines: StatLine[];
  players: Player[];
  potgId: number | null;
  /** When present, made FT / 2PT / 3PT columns are derived from play-by-play. */
  events?: GameEvent[];
}) {
  const [sort, setSort] = useState<ColKey>("pir");
  const byId = new Map(players.map((p) => [p.id, p]));
  const byPlayer = events?.length ? playerScoringFromEvents(events) : new Map<number, ScoringFromEvents>();
  const fromEvents = [...byPlayer.values()].some(hasScoring);
  const eventTotals = fromEvents
    ? scoringTotal(lines.map((l) => byPlayer.get(l.playerId) ?? emptyScoring()))
    : emptyScoring();
  const visible = columns.filter((c) => c.has(lines, fromEvents));
  const totals = teamGameTotals(lines);
  const scoringFor = (playerId: number) => byPlayer.get(playerId) ?? emptyScoring();
  const sorted = [...lines].sort((a, b) => {
    if (sort === "player") {
      const an = byId.get(a.playerId)?.name ?? "";
      const bn = byId.get(b.playerId)?.name ?? "";
      return an.localeCompare(bn, "he") || a.playerId - b.playerId;
    }
    const col = visible.find((c) => c.key === sort) ?? visible.find((c) => c.key === "pir")!;
    return compareDesc(col.sortValue(a, scoringFor(a.playerId)), col.sortValue(b, scoringFor(b.playerId))) || a.playerId - b.playerId;
  });

  return (
    <div className="card overflow-hidden">
      {fromEvents ? <p className="border-b border-border px-3 py-2 text-[11px] text-muted">{he.live.scoringFromEvents}</p> : null}
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">{he.games.boxScore}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2 text-xs text-muted">
              <SortableTh label={he.games.player} active={sort === "player"} onSort={() => setSort("player")} align="start" sticky />
              {visible.map((c) => (
                <SortableTh key={c.key} label={c.label} abbr={c.abbr} active={sort === c.key} onSort={() => setSort(c.key)} />
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => {
              const p = byId.get(l.playerId);
              const isPotg = l.playerId === potgId;
              const scoring = scoringFor(l.playerId);
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
                    <td
                      key={c.key}
                      className={cn(
                        "num px-2.5 py-2.5 text-center",
                        c.key === sort && "font-bold text-team",
                        c.key === "pts" && sort !== "pts" && "font-bold text-text",
                      )}
                    >
                      <bdi dir="ltr">{c.value(l, scoring)}</bdi>
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
                    <bdi dir="ltr">{c.total(totals, eventTotals)}</bdi>
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
