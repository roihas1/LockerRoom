"use client";

import Link from "next/link";
import { useState } from "react";
import { ResultBadge } from "@/components/common/result-badge";
import { SortableTh } from "@/components/stats/sortable-th";
import { he } from "@/config/strings";
import { teamGameTotals } from "@/lib/stats/aggregate";
import { compareNum, compareText, toggleSortDir, type SortDir } from "@/lib/stats/sort-value";
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
  topPoints: number | null;
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
  const [dir, setDir] = useState<SortDir>("desc");
  const onSort = (key: SortKey) => {
    if (key === sort) setDir(toggleSortDir);
    else {
      setSort(key);
      setDir(key === "opponent" || key === "top" ? "asc" : "desc");
    }
  };
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
      topPoints: top?.points ?? null,
      margin: (g.teamScore ?? 0) - (g.opponentScore ?? 0),
    };
  });
  const rows = [...built].sort((a, b) => {
    switch (sort) {
      case "opponent":
        return compareText(a.game.opponent, b.game.opponent, dir) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "date":
        return compareText(a.game.tipoffAt, b.game.tipoffAt, dir);
      case "result":
        return compareNum(a.margin, b.margin, dir) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "reb":
        return compareNum(a.rebounds, b.rebounds, dir) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "ast":
        return compareNum(a.assists, b.assists, dir) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "fg":
        return compareNum(a.fgPct, b.fgPct, dir) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
      case "top":
        return compareNum(a.topPoints, b.topPoints, dir) || compareText(a.topName, b.topName, "asc");
      case "pir":
      default:
        return compareNum(a.pir, b.pir, dir) || b.game.tipoffAt.localeCompare(a.game.tipoffAt);
    }
  });

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-max text-sm">
          <caption className="sr-only">{he.statsPage.games}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2 text-xs text-muted">
              <SortableTh label={he.admin.gameForm.opponent} active={sort === "opponent"} dir={dir} onSort={() => onSort("opponent")} align="start" />
              <SortableTh label={he.admin.gameForm.date} active={sort === "date"} dir={dir} onSort={() => onSort("date")} />
              <SortableTh label={he.games.resultCol} active={sort === "result"} dir={dir} onSort={() => onSort("result")} />
              <SortableTh label={he.stats.rebounds} active={sort === "reb"} dir={dir} onSort={() => onSort("reb")} />
              <SortableTh label={he.stats.assists} active={sort === "ast"} dir={dir} onSort={() => onSort("ast")} />
              <SortableTh label={he.stats.fg} active={sort === "fg"} dir={dir} onSort={() => onSort("fg")} />
              <SortableTh label={he.stats.pir} abbr="PIR" active={sort === "pir"} dir={dir} onSort={() => onSort("pir")} />
              <SortableTh label={he.games.topScorer} active={sort === "top"} dir={dir} onSort={() => onSort("top")} align="start" />
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
                  {r.topName && r.topPoints != null ? (
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
