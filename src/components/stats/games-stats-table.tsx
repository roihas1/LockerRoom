"use client";

import Link from "next/link";
import { useState } from "react";
import { ResultBadge } from "@/components/common/result-badge";
import { SortableTh } from "@/components/stats/sortable-th";
import { he } from "@/config/strings";
import { teamGameTotals } from "@/lib/stats/aggregate";
import { compareDesc } from "@/lib/stats/sort-value";
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/dates";
import { formatPercent } from "@/lib/utils/numbers";
import type { Game, Player, StatLine } from "@/types/domain";

type SortKey = "opponent" | "date" | "result" | "reb" | "ast" | "fg" | "pir" | "top";

type Row = {
  game: Game;
  rebounds: number;
  assists: number;
  fgPct: number | null;
  pir: number;
  topName: string;
  topPoints: number;
  margin: number;
};

export function GamesStatsTable({
  games,
  lines,
  playersById,
}: {
  games: Game[];
  lines: StatLine[];
  playersById: Map<number, Player>;
}) {
  const [sort, setSort] = useState<SortKey>("pir");
  const built: Row[] = games.map((g) => {
    const gameLines = lines.filter((l) => l.gameId === g.id);
    const t = teamGameTotals(gameLines);
    const top = [...gameLines].sort((a, b) => b.points - a.points)[0];
    const topPlayer = top ? playersById.get(top.playerId) : undefined;
    return {
      game: g,
      rebounds: t.rebounds,
      assists: t.assists,
      fgPct: t.fg.pct,
      pir: t.pir,
      topName: topPlayer?.name ?? "",
      topPoints: top?.points ?? Number.NEGATIVE_INFINITY,
      margin: (g.teamScore ?? 0) - (g.opponentScore ?? 0),
    };
  });
  const rows = [...built].sort((a, b) => {
    switch (sort) {
      case "opponent":
        return a.game.opponent.localeCompare(b.game.opponent, "he") || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "date":
        return b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "result":
        return compareDesc(a.margin, b.margin) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "reb":
        return compareDesc(a.rebounds, b.rebounds) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "ast":
        return compareDesc(a.assists, b.assists) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "fg":
        return compareDesc(a.fgPct, b.fgPct) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "top":
        return compareDesc(a.topPoints, b.topPoints) || a.topName.localeCompare(b.topName, "he");
      case "pir":
      default:
        return compareDesc(a.pir, b.pir) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
    }
  });

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-max text-sm">
          <caption className="sr-only">{he.statsPage.games}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2 text-xs text-muted">
              <SortableTh label={he.admin.gameForm.opponent} active={sort === "opponent"} onSort={() => setSort("opponent")} align="start" />
              <SortableTh label={he.admin.gameForm.date} active={sort === "date"} onSort={() => setSort("date")} />
              <SortableTh label={he.games.resultCol} active={sort === "result"} onSort={() => setSort("result")} />
              <SortableTh label={he.stats.rebounds} active={sort === "reb"} onSort={() => setSort("reb")} />
              <SortableTh label={he.stats.assists} active={sort === "ast"} onSort={() => setSort("ast")} />
              <SortableTh label={he.stats.fg} active={sort === "fg"} onSort={() => setSort("fg")} />
              <SortableTh label={he.stats.pir} abbr="PIR" active={sort === "pir"} onSort={() => setSort("pir")} />
              <SortableTh label={he.games.topScorer} active={sort === "top"} onSort={() => setSort("top")} align="start" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.game.id} className="border-b border-border/60 last:border-0">
                <th scope="row" className="px-3 py-2.5 text-start font-semibold">
                  <Link href={`/games/${r.game.id}`} className="hover:text-team" data-user-content>
                    {r.game.opponent}
                  </Link>
                </th>
                <td className={cn("num px-2.5 py-2.5 text-center text-muted", sort === "date" && "font-bold text-team")}>{formatShortDate(r.game.tipoffAt)}</td>
                <td className={cn("px-2.5 py-2.5 text-center", sort === "result" && "font-bold")}>
                  <span className="inline-flex items-center gap-2">
                    <ResultBadge game={r.game} />
                    <bdi dir="ltr" className="num font-bold">
                      {r.game.teamScore}:{r.game.opponentScore}
                    </bdi>
                  </span>
                </td>
                <td className={cn("num px-2.5 py-2.5 text-center", sort === "reb" && "font-bold text-team")}>{r.rebounds}</td>
                <td className={cn("num px-2.5 py-2.5 text-center", sort === "ast" && "font-bold text-team")}>{r.assists}</td>
                <td className={cn("num px-2.5 py-2.5 text-center", sort === "fg" && "font-bold text-team")}>{formatPercent(r.fgPct)}</td>
                <td className={cn("num px-2.5 py-2.5 text-center", sort === "pir" && "font-bold text-team")}>{r.pir}</td>
                <td className={cn("px-3 py-2.5", sort === "top" && "font-bold text-team")}>
                  {r.topName ? (
                    <span>
                      <span data-user-content>{r.topName}</span> <span className="num font-bold">{r.topPoints}</span>
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
