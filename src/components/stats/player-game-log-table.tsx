"use client";

import Link from "next/link";
import { useState } from "react";
import { SortableTh } from "@/components/stats/sortable-th";
import { he } from "@/config/strings";
import { gameResult } from "@/lib/stats/games";
import { computePir } from "@/lib/stats/pir";
import { emptyScoring, hasScoring, type ScoringFromEvents } from "@/lib/stats/scoring-from-events";
import { compareDesc, splitSortValue } from "@/lib/stats/sort-value";
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/dates";
import { formatInt, formatSplit } from "@/lib/utils/numbers";
import type { Game, StatLine } from "@/types/domain";

type SortKey = "opponent" | "pts" | "reb" | "ast" | "fg" | "three" | "twoEvt" | "threeEvt" | "ftEvt" | "pir";

export function PlayerGameLogTable({
  log,
  scoringByGame,
}: {
  log: { line: StatLine; game: Game }[];
  /** Per-game made FT / 2PT / 3PT from play-by-play (when available). Keys are game ids. */
  scoringByGame?: Record<string, ScoringFromEvents>;
}) {
  const [sort, setSort] = useState<SortKey>("pir");
  const fromEvents = scoringByGame ? Object.values(scoringByGame).some(hasScoring) : false;
  const scoringFor = (gameId: number) => scoringByGame?.[String(gameId)] ?? emptyScoring();
  const showManualShooting = !fromEvents && log.some((r) => r.line.fgAttempted !== null || r.line.threeAttempted !== null);

  const rows = [...log].sort((a, b) => {
    const sa = scoringFor(a.game.id);
    const sb = scoringFor(b.game.id);
    switch (sort) {
      case "opponent":
        return a.game.opponent.localeCompare(b.game.opponent, "he") || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "pts":
        return compareDesc(a.line.points, b.line.points) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "reb":
        return compareDesc(a.line.rebounds, b.line.rebounds) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "ast":
        return compareDesc(a.line.assists, b.line.assists) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "fg":
        return compareDesc(splitSortValue(a.line.fgMade, a.line.fgAttempted), splitSortValue(b.line.fgMade, b.line.fgAttempted)) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "three":
        return (
          compareDesc(splitSortValue(a.line.threeMade, a.line.threeAttempted), splitSortValue(b.line.threeMade, b.line.threeAttempted)) ||
          b.game.tipoffAt.localeCompare(a.game.tipoffAt)
        );
      case "twoEvt":
        return compareDesc(sa.two, sb.two) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "threeEvt":
        return compareDesc(sa.three, sb.three) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "ftEvt":
        return compareDesc(sa.ft, sb.ft) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "pir":
      default:
        return compareDesc(computePir(a.line), computePir(b.line)) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
    }
  });

  return (
    <div className="card overflow-hidden">
      {fromEvents ? <p className="border-b border-border px-3 py-2 text-[11px] text-muted">{he.live.scoringFromEvents}</p> : null}
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-max text-sm">
          <caption className="sr-only">{he.roster.gameLog}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2 text-xs text-muted">
              <SortableTh label={he.admin.gameForm.opponent} active={sort === "opponent"} onSort={() => setSort("opponent")} align="start" />
              <SortableTh label={he.stats.points} active={sort === "pts"} onSort={() => setSort("pts")} />
              <SortableTh label={he.stats.rebounds} active={sort === "reb"} onSort={() => setSort("reb")} />
              <SortableTh label={he.stats.assists} active={sort === "ast"} onSort={() => setSort("ast")} />
              {fromEvents ? (
                <>
                  <SortableTh label={he.live.twos} abbr={he.live.twosAbbr} active={sort === "twoEvt"} onSort={() => setSort("twoEvt")} />
                  <SortableTh label={he.stats.three} abbr="3PT" active={sort === "threeEvt"} onSort={() => setSort("threeEvt")} />
                  <SortableTh label={he.stats.ft} abbr="FT" active={sort === "ftEvt"} onSort={() => setSort("ftEvt")} />
                </>
              ) : null}
              {showManualShooting ? (
                <>
                  <SortableTh label={he.stats.fg} active={sort === "fg"} onSort={() => setSort("fg")} />
                  <SortableTh label={he.stats.three} active={sort === "three"} onSort={() => setSort("three")} />
                </>
              ) : null}
              <SortableTh label={he.stats.pir} abbr="PIR" active={sort === "pir"} onSort={() => setSort("pir")} />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, game }) => {
              const r = gameResult(game);
              const scoring = scoringFor(game.id);
              return (
                <tr key={game.id} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="px-3 py-2.5 text-start font-semibold">
                    <Link href={`/games/${game.id}`} className="flex items-center gap-2 hover:text-team">
                      <span className={cn("num text-xs font-bold", r === "win" ? "text-win" : "text-loss")}>
                        {r === "win" ? he.result.winShort : he.result.lossShort}
                      </span>
                      <span data-user-content>{game.opponent}</span>
                      <span className="num text-xs text-muted">{formatShortDate(game.tipoffAt)}</span>
                    </Link>
                  </th>
                  <td className={cn("num px-2.5 py-2.5 text-center", sort === "pts" ? "font-bold text-team" : "font-bold")}>{line.points}</td>
                  <td className={cn("num px-2.5 py-2.5 text-center", sort === "reb" && "font-bold text-team")}>{line.rebounds}</td>
                  <td className={cn("num px-2.5 py-2.5 text-center", sort === "ast" && "font-bold text-team")}>{line.assists}</td>
                  {fromEvents ? (
                    <>
                      <td className={cn("num px-2.5 py-2.5 text-center", sort === "twoEvt" && "font-bold text-team")}>{formatInt(scoring.two)}</td>
                      <td className={cn("num px-2.5 py-2.5 text-center", sort === "threeEvt" && "font-bold text-team")}>{formatInt(scoring.three)}</td>
                      <td className={cn("num px-2.5 py-2.5 text-center", sort === "ftEvt" && "font-bold text-team")}>{formatInt(scoring.ft)}</td>
                    </>
                  ) : null}
                  {showManualShooting ? (
                    <>
                      <td className={cn("num px-2.5 py-2.5 text-center", sort === "fg" && "font-bold text-team")}>
                        <bdi dir="ltr">{formatSplit(line.fgMade, line.fgAttempted)}</bdi>
                      </td>
                      <td className={cn("num px-2.5 py-2.5 text-center", sort === "three" && "font-bold text-team")}>
                        <bdi dir="ltr">{formatSplit(line.threeMade, line.threeAttempted)}</bdi>
                      </td>
                    </>
                  ) : null}
                  <td className={cn("num px-2.5 py-2.5 text-center", sort === "pir" && "font-bold text-team")}>{computePir(line)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
