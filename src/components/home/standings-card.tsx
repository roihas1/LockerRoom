import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { he } from "@/config/strings";
import { standingsAroundUs, type LeagueTable } from "@/lib/league/table";
import { cn } from "@/lib/utils/cn";

export function StandingsCard({ table }: { table: LeagueTable }) {
  const around = standingsAroundUs(table.rows);
  if (!around) return null;
  const started = table.rows.some((r) => r.gp > 0);
  const { us, total } = around;

  return (
    <Link
      href="/standings"
      className="card group block overflow-hidden transition-colors hover:border-team/50"
      aria-label={`${he.home.standings.title}: ${started ? he.home.standings.place(us.rank, total) : he.home.standings.notStarted}`}
    >
      <div className="flex items-center justify-between gap-4 p-4 pb-3">
        <div>
          <p className="text-xs font-semibold text-muted">{he.home.standings.title}</p>
          {started ? (
            <p className="font-display text-2xl font-black">
              {he.home.standings.placeLabel} <span className="num text-team">{us.rank}</span>
              <span className="text-base font-bold text-muted"> {he.home.standings.outOf(total)}</span>
            </p>
          ) : (
            <p className="font-display text-lg font-extrabold">{he.home.standings.notStarted}</p>
          )}
        </div>
        {started ? (
          <div className="text-center">
            <bdi dir="ltr" className="num block text-xl font-black">
              {us.w}-{us.l}
            </bdi>
            <span className="text-[11px] text-muted">{he.stats.record}</span>
          </div>
        ) : null}
      </div>

      <ol className="border-y border-border/60 text-sm">
        {around.rows.map((r) => (
          <li
            key={r.teamId}
            className={cn("flex items-center gap-3 px-4 py-2", r.isUs ? "bg-team/10 font-bold text-team" : "text-text")}
            aria-current={r.isUs ? "true" : undefined}
          >
            <span className="num w-5 shrink-0 text-center text-muted">{started ? r.rank : "–"}</span>
            <span className="min-w-0 flex-1 truncate" data-user-content>
              {r.name}
            </span>
            <bdi dir="ltr" className="num shrink-0 text-xs text-muted">
              {r.w}-{r.l}
            </bdi>
            <span className="num w-8 shrink-0 text-center font-bold">{r.pts}</span>
          </li>
        ))}
      </ol>

      <p className="flex items-center justify-center gap-0.5 p-3 text-sm font-semibold text-team group-hover:underline">
        {he.home.standings.fullTable}
        <ChevronLeft className="size-4" aria-hidden />
      </p>
    </Link>
  );
}
