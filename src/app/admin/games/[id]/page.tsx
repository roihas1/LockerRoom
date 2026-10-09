import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { GameDetailsForm } from "@/app/admin/games/game-details-form";
import { GameHighlightsForm } from "@/app/admin/games/game-highlights-form";
import { GameReviewPanel } from "@/app/admin/games/game-review-panel";
import { GameWizardNav, type GameWizardStep } from "@/components/admin/game-wizard-nav";
import { StatsEntryForm } from "@/components/admin/stats-entry/stats-entry-form";
import { buildInitialRows } from "@/components/admin/stats-entry/types";
import { GameDetail } from "@/components/games/game-detail";
import { he } from "@/config/strings";
import { getStatsEntryDefaults } from "@/lib/admin/lineup";
import { getAdminData } from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/env";
import { firstParam, parseId } from "@/lib/utils/params";

const allowedSteps = new Set<GameWizardStep>(["details", "stats", "highlights", "review"]);

function resolveStep(raw: string | undefined): GameWizardStep {
  if (raw && allowedSteps.has(raw as GameWizardStep)) return raw as GameWizardStep;
  return "details";
}

export default async function AdminGamePage({ params, searchParams }: PageProps<"/admin/games/[id]">) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) notFound();

  const sp = await searchParams;
  const step = resolveStep(firstParam(sp.step));

  const data = await getAdminData();
  const [game, seasons, team] = await Promise.all([data.getGame(id), data.getSeasons(), data.getTeam()]);
  if (!game) notFound();

  const lines = await data.getGameLines(id);
  const players = await data.getPlayers({ includeInactive: false });
  const statsDefaults = step === "stats" ? await getStatsEntryDefaults(data, game) : null;
  const statsInitialRows =
    statsDefaults && step === "stats"
      ? buildInitialRows(players, statsDefaults.playedIds, statsDefaults.linesByPlayer).map((r) => ({ ...r }))
      : [];
  const playedIds = new Set(lines.map((l) => l.playerId));
  const potgCandidates =
    playedIds.size > 0
      ? players
          .filter((p) => playedIds.has(p.id))
          .sort((a, b) => (lines.find((l) => l.playerId === b.id)?.points ?? 0) - (lines.find((l) => l.playerId === a.id)?.points ?? 0))
      : players.filter((p) => p.isActive);

  const detail = step === "review" || step === "highlights" ? await data.getGameDetail(id) : null;
  const demo = isDemoMode();

  return (
    <div className="space-y-6">
      <Link href="/admin/games" className="text-sm text-muted hover:text-text">
        {he.actions.back}
      </Link>
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold" data-user-content>
            {he.result.vs} {game.opponent}
          </h1>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/games/${id}/live`}>{he.admin.liveStats.title}</Link>
          </Button>
        </div>
        <GameWizardNav gameId={id} step={step} />
      </header>

      {step === "details" ? <GameDetailsForm game={game} seasons={seasons} defaultSeasonId={game.seasonId} demo={demo} /> : null}

      {step === "stats" ? (
        <StatsEntryForm gameId={id} teamScore={game.teamScore} players={players} initialRows={statsInitialRows} demo={demo} />
      ) : null}

      {step === "highlights" ? (
        <GameHighlightsForm game={game} potgCandidates={potgCandidates} gallery={detail?.media ?? []} demo={demo} />
      ) : null}

      {step === "review" ? (
        <>
          <GameReviewPanel gameId={id} isPublished={game.isPublished} demo={demo} />
          {detail ? (
            <div className="rounded-2xl border border-border p-2">
              <p className="mb-4 px-2 text-sm text-muted">{he.actions.preview}</p>
              <GameDetail detail={detail} team={team} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
