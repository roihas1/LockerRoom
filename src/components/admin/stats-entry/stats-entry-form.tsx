"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { saveGameStats } from "@/app/admin/games/actions";
import { he } from "@/config/strings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/form-controls";
import type { Player } from "@/types/domain";
import type { ActionResult } from "@/lib/utils/action-result";
import { StatsDesktopTable } from "./stats-desktop-table";
import { StatsMobileCards } from "./stats-mobile-cards";
import { rowsEqual, sumPlayedPoints, type StatRowState } from "./types";

function optionalInputValue(v: number | null): string {
  return v === null ? "" : String(v);
}

export function StatsEntryForm({
  gameId,
  teamScore,
  players,
  initialRows,
  demo,
}: {
  gameId: number;
  teamScore: number | null;
  players: Player[];
  initialRows: StatRowState[];
  demo: boolean;
}) {
  const [baseline, setBaseline] = useState(initialRows);
  const [rows, setRows] = useState<StatRowState[]>(initialRows);
  const [showMore, setShowMore] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveGameStats, null);

  const dirty = !rowsEqual(rows, baseline);
  const pointsSum = sumPlayedPoints(rows);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
    } else if (state && !state.ok && state.code !== "demo") {
      toast.error(state.message);
    }
  }, [state]);

  useEffect(() => {
    if (!state?.ok) return;
    // Clear the unsaved-changes guard after a successful save without tying baseline to render.
    const snapshot = rows.map((r) => ({ ...r }));
    const t = window.setTimeout(() => setBaseline(snapshot), 0);
    return () => window.clearTimeout(t);
  }, [state, rows]);

  const togglePlayed = (playerId: number, played: boolean) => {
    setRows((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, played } : r)));
  };

  const patchRow = (playerId: number, patch: Partial<StatRowState>) => {
    setRows((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, ...patch } : r)));
  };

  const selectAll = () => setRows((prev) => prev.map((r) => ({ ...r, played: true })));
  const clearAll = () => setRows((prev) => prev.map((r) => ({ ...r, played: false })));

  const scoreWarning =
    teamScore !== null && pointsSum !== teamScore ? he.admin.statsEntry.sumMismatch(pointsSum, teamScore) : null;
  const scoreOk = teamScore !== null && pointsSum === teamScore;

  return (
    <form action={formAction} noValidate className="space-y-6">
      <input type="hidden" name="gameId" value={gameId} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">{he.admin.statsEntry.whoPlayed}</h2>
            <p className="text-sm text-muted">{he.admin.statsEntry.whoPlayedHint}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
              {he.admin.statsEntry.selectAll}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              {he.admin.statsEntry.clearAll}
            </Button>
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => {
            const row = rows.find((r) => r.playerId === p.id)!;
            return (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2">
                  <Checkbox
                    name="played"
                    value={p.id}
                    checked={row.played}
                    onChange={(e) => togglePlayed(p.id, e.target.checked)}
                  />
                  <span className="font-medium">{p.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowMore((v) => !v)}>
          {showMore ? he.admin.statsEntry.fewerStats : he.admin.statsEntry.moreStats}
        </Button>
        {scoreWarning ? <p className="text-sm text-warning">{scoreWarning}</p> : null}
        {scoreOk ? <p className="text-sm text-success">{he.admin.statsEntry.sumMatches}</p> : null}
      </div>

      <StatsMobileCards players={players} rows={rows} index={mobileIndex} onIndexChange={setMobileIndex} onChange={patchRow} />
      <StatsDesktopTable
        players={players}
        rows={rows}
        showMore={showMore}
        onChange={patchRow}
        fieldErrors={state && !state.ok ? state.fieldErrors : undefined}
      />

      {rows
        .filter((r) => r.played)
        .map((r) => (
          <div key={r.playerId} className="sr-only" aria-hidden>
            <input name={`points_${r.playerId}`} value={r.points} readOnly />
            <input name={`rebounds_${r.playerId}`} value={r.rebounds} readOnly />
            <input name={`assists_${r.playerId}`} value={r.assists} readOnly />
            <input name={`steals_${r.playerId}`} value={optionalInputValue(r.steals)} readOnly />
            <input name={`blocks_${r.playerId}`} value={optionalInputValue(r.blocks)} readOnly />
            <input name={`turnovers_${r.playerId}`} value={optionalInputValue(r.turnovers)} readOnly />
            <input name={`fouls_${r.playerId}`} value={optionalInputValue(r.fouls)} readOnly />
            <input name={`fgMade_${r.playerId}`} value={optionalInputValue(r.fgMade)} readOnly />
            <input name={`fgAttempted_${r.playerId}`} value={optionalInputValue(r.fgAttempted)} readOnly />
            <input name={`threeMade_${r.playerId}`} value={optionalInputValue(r.threeMade)} readOnly />
            <input name={`threeAttempted_${r.playerId}`} value={optionalInputValue(r.threeAttempted)} readOnly />
            <input name={`ftMade_${r.playerId}`} value={optionalInputValue(r.ftMade)} readOnly />
            <input name={`ftAttempted_${r.playerId}`} value={optionalInputValue(r.ftAttempted)} readOnly />
          </div>
        ))}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending || demo}>
          {pending ? he.upload.processing : he.actions.save}
        </Button>
        {demo ? <p className="self-center text-sm text-muted">{he.errors.demoMode}</p> : null}
      </div>
      {state && !state.ok && state.fieldErrors?._form ? (
        <p role="alert" className="text-sm text-loss">
          {state.fieldErrors._form[0]}
        </p>
      ) : null}
    </form>
  );
}
