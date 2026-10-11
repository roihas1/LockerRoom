import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { ResultBadge } from "@/components/common/result-badge";
import { StatTile } from "@/components/common/stat-tile";
import { SectionHeader } from "@/components/common/section-header";
import { opponentLogo } from "@/config/opponents";
import { he } from "@/config/strings";
import { OpponentStandingLine } from "@/components/scouting/opponent-standing-line";
import type { ScoutingBundle } from "@/lib/league/scouting";
import { formatAverage } from "@/lib/utils/numbers";
import { formatShortDate } from "@/lib/utils/dates";
export function OpponentScoutingView({ bundle }: { bundle: ScoutingBundle }) {
  const logo = opponentLogo(bundle.opponent);
  const hasAverages = bundle.avgScored != null && bundle.avgAllowed != null;

  return (
    <div className="space-y-8">
      <header className="card flex flex-wrap items-center gap-4 p-5">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="size-16 rounded-xl bg-white object-contain p-1" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-black" data-user-content>
            {bundle.opponent}
          </h1>
          <OpponentStandingLine opponent={bundle.opponent} initial={bundle.standing} />
        </div>
        {hasAverages ? (
          <div className="flex gap-2">
            <StatTile value={formatAverage(bundle.avgScored ?? 0)} label={he.scoutingPage.avgScored} size="sm" />
            <StatTile value={formatAverage(bundle.avgAllowed ?? 0)} label={he.scoutingPage.avgAllowed} size="sm" />
          </div>
        ) : null}
      </header>

      <section>
        <SectionHeader title={he.scoutingPage.recentResults} />
        {bundle.recentResults.length ? (
          <ul className="card divide-y divide-border/60 text-sm">
            {bundle.recentResults.map((r) => (
              <li key={`${r.playedAt}-${r.homeTeamId}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span data-user-content>
                  {r.homeName} <span className="num font-bold">{r.homePoints}</span> :{" "}
                  <span className="num font-bold">{r.awayPoints}</span> {r.awayName}
                </span>
                <span className="num text-xs text-muted">{formatShortDate(r.playedAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState emoji="📋" title={he.empty.scoutingResults.title} text={he.empty.scoutingResults.text} />
        )}
        <p className="mt-2 text-xs text-muted">{he.scoutingPage.ibbaSource}</p>
      </section>

      <section>
        <SectionHeader title={he.scoutingPage.headToHead} />
        {bundle.headToHead.length ? (
          <ul className="card divide-y divide-border/60 text-sm">
            {bundle.headToHead.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <Link href={`/games/${g.id}`} className="font-semibold hover:text-team">
                  {formatShortDate(g.tipoffAt)}
                </Link>
                <span className="inline-flex items-center gap-2">
                  <ResultBadge game={g} />
                  <bdi dir="ltr" className="num font-bold">
                    {g.teamScore}:{g.opponentScore}
                  </bdi>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{he.scoutingPage.noH2h}</p>
        )}
      </section>

      <section>
        <SectionHeader title={he.scoutingPage.topScorers} />
        {bundle.ibbaPlayers.length ? (
          <div className="card overflow-x-auto scrollbar-none">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-xs text-muted">
                  <th className="px-3 py-2 text-start">{he.scoutingPage.keyPlayers}</th>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">{he.stats.points}</th>
                  <th className="px-2 py-2">{he.stats.rebounds}</th>
                  <th className="px-2 py-2">{he.stats.assists}</th>
                </tr>
              </thead>
              <tbody>
                {bundle.ibbaPlayers.map((p) => (
                  <tr key={p.playerId} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 font-semibold" data-user-content>
                      {p.name}
                    </td>
                    <td className="num px-2 py-2 text-center">{p.number ?? "–"}</td>
                    <td className="num px-2 py-2 text-center">{formatAverage(p.ppg)}</td>
                    <td className="num px-2 py-2 text-center">{formatAverage(p.rpg)}</td>
                    <td className="num px-2 py-2 text-center">{formatAverage(p.apg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState emoji="👀" title={he.empty.scoutingPlayers.title} text={he.empty.scoutingPlayers.text} />
        )}
      </section>

      {bundle.coachNotes?.notes || bundle.coachNotes?.keyPlayers?.length ? (
        <section>
          <SectionHeader title={he.scoutingPage.coachNotes} />
          <div className="card space-y-4 p-4 text-sm">
            {bundle.coachNotes.notes ? <p data-user-content>{bundle.coachNotes.notes}</p> : null}
            {bundle.coachNotes.keyPlayers.length ? (
              <ul className="space-y-2">
                {bundle.coachNotes.keyPlayers.map((p) => (
                  <li key={`${p.name}-${p.number ?? ""}`} data-user-content>
                    <span className="font-bold">{p.name}</span>
                    {p.number ? <span className="num"> #{p.number}</span> : null}
                    {p.position ? ` · ${p.position}` : null}
                    {p.note ? <span className="text-muted"> — {p.note}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
