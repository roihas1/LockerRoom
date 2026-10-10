import type { Metadata } from "next";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/section-header";
import { he } from "@/config/strings";
import { getLeagueTable, type StandingRow } from "@/lib/league/table";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: he.standingsPage.title };

const columns: { key: keyof StandingRow; label: string }[] = [
  { key: "gp", label: he.stats.gamesPlayed },
  { key: "w", label: he.standingsPage.wins },
  { key: "l", label: he.standingsPage.losses },
  { key: "pf", label: he.standingsPage.pointsFor },
  { key: "pa", label: he.standingsPage.pointsAgainst },
  { key: "diff", label: he.standingsPage.diff },
];

export default async function StandingsPage() {
  const table = await getLeagueTable();

  if (!table || table.rows.length === 0) {
    return (
      <>
        <PageHeader title={he.standingsPage.title} />
        <EmptyState emoji="🏆" title={he.empty.standings.title} text={he.empty.standings.text} />
      </>
    );
  }

  const notStarted = table.rows.every((r) => r.gp === 0);

  return (
    <>
      <PageHeader title={he.standingsPage.title} subtitle={table.title} />
      {notStarted ? <p className="mb-4 text-sm text-muted">{he.standingsPage.notStarted}</p> : null}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-max text-sm">
            <caption className="sr-only">{he.standingsPage.title}</caption>
            <thead>
              <tr className="border-b border-border bg-surface-2 text-xs text-muted">
                <th scope="col" className="px-3 py-2.5 text-center font-semibold">
                  {he.standingsPage.pos}
                </th>
                <th scope="col" className="px-3 py-2.5 text-start font-semibold">
                  {he.standingsPage.team}
                </th>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className="px-2.5 py-2.5 font-semibold">
                    {c.label}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2.5 font-semibold text-text">
                  {he.standingsPage.leaguePoints}
                </th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr
                  key={r.teamId}
                  aria-current={r.isUs ? "true" : undefined}
                  className={cn("border-b border-border/60 last:border-0", r.isUs && "bg-team/10")}
                >
                  <td className="num px-3 py-2.5 text-center text-muted">{r.pos || i + 1}</td>
                  <th scope="row" className={cn("px-3 py-2.5 text-start font-semibold", r.isUs && "text-team")} data-user-content>
                    {r.name}
                  </th>
                  {columns.map((c) => (
                    <td key={c.key} className="num px-2.5 py-2.5 text-center">
                      {c.key === "diff" && r.diff > 0 ? <bdi dir="ltr">+{r.diff}</bdi> : <bdi dir="ltr">{r[c.key] as number}</bdi>}
                    </td>
                  ))}
                  <td className="num px-3 py-2.5 text-center font-bold">{r.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        <a href={table.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-team hover:underline">
          {he.standingsPage.source}
        </a>
      </p>
    </>
  );
}
