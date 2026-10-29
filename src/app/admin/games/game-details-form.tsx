"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveGameDetailsAction } from "@/app/admin/games/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { gameStatusLabels, homeAwayLabels } from "@/config/labels";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import { toIsraelInputs } from "@/lib/utils/dates";
import type { Game, Season } from "@/types/domain";

function fieldError(state: ActionResult | null, key: string) {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[key];
}

export function GameDetailsForm({
  game,
  seasons,
  defaultSeasonId,
  demo,
}: {
  game?: Game;
  seasons: Season[];
  defaultSeasonId: number;
  demo: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveGameDetailsAction, null as ActionResult | null);
  const tipoff = game ? toIsraelInputs(game.tipoffAt) : { date: "", time: "20:00" };

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  const disabled = demo || pending;

  return (
    <form action={action} noValidate className="card space-y-4 p-5">
      {game ? <input type="hidden" name="gameId" value={game.id} /> : null}
      {state && !state.ok ? (
        <p role="alert" className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {state.message}
        </p>
      ) : null}

      <Field label={he.admin.gameForm.season} htmlFor="seasonId">
        <Select id="seasonId" name="seasonId" defaultValue={game?.seasonId ?? defaultSeasonId} disabled={disabled}>
          {seasons.map((s) => (
            <option key={s.id} value={s.id} data-user-content>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={he.admin.gameForm.opponent} htmlFor="opponent" error={fieldError(state, "opponent")}>
        <Input id="opponent" name="opponent" defaultValue={game?.opponent ?? ""} required disabled={disabled} data-user-content />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={he.admin.gameForm.round} htmlFor="roundNumber" error={fieldError(state, "roundNumber")}>
          <Input id="roundNumber" name="roundNumber" inputMode="numeric" defaultValue={game?.roundNumber ?? ""} disabled={disabled} className="num" />
        </Field>
        <Field label={he.admin.gameForm.homeAway} htmlFor="homeAway">
          <Select id="homeAway" name="homeAway" defaultValue={game?.homeAway ?? "home"} disabled={disabled}>
            {(Object.keys(homeAwayLabels) as (keyof typeof homeAwayLabels)[]).map((k) => (
              <option key={k} value={k}>
                {homeAwayLabels[k]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={he.admin.gameForm.date} htmlFor="date" error={fieldError(state, "date")}>
          <Input id="date" name="date" type="date" defaultValue={tipoff.date} required disabled={disabled} className="num" />
        </Field>
        <Field label={he.admin.gameForm.time} htmlFor="time" error={fieldError(state, "time")}>
          <Input id="time" name="time" type="time" defaultValue={tipoff.time} required disabled={disabled} className="num" />
        </Field>
      </div>
      <Field label={he.admin.gameForm.location} htmlFor="location">
        <Input id="location" name="location" defaultValue={game?.location ?? ""} disabled={disabled} data-user-content />
      </Field>
      <Field label={he.admin.gameForm.status} htmlFor="status">
        <Select id="status" name="status" defaultValue={game?.status ?? "scheduled"} disabled={disabled}>
          {(Object.keys(gameStatusLabels) as (keyof typeof gameStatusLabels)[]).map((k) => (
            <option key={k} value={k}>
              {gameStatusLabels[k]}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-start gap-3 rounded-xl border border-border px-3 py-3 text-sm">
        <input
          type="checkbox"
          name="isPractice"
          value="on"
          defaultChecked={game?.isPractice ?? false}
          disabled={disabled}
          className="mt-0.5 size-4 accent-[var(--team-primary)]"
        />
        <span>
          <span className="block font-semibold">{he.admin.gameForm.practice}</span>
          <span className="text-muted">{he.admin.gameForm.practiceHint}</span>
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-xl border border-border px-3 py-3 text-sm">
        <input
          type="checkbox"
          name="isCup"
          value="on"
          defaultChecked={game?.isCup ?? false}
          disabled={disabled}
          className="mt-0.5 size-4 accent-[var(--team-primary)]"
        />
        <span>
          <span className="block font-semibold">{he.admin.gameForm.cup}</span>
          <span className="text-muted">{he.admin.gameForm.cupHint}</span>
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-xl border border-border px-3 py-3 text-sm">
        <input
          type="checkbox"
          name="excludeFromStats"
          value="on"
          defaultChecked={game?.excludeFromStats ?? false}
          disabled={disabled}
          className="mt-0.5 size-4 accent-[var(--team-primary)]"
        />
        <span>
          <span className="block font-semibold">{he.admin.gameForm.excludeFromStats}</span>
          <span className="text-muted">{he.admin.gameForm.excludeFromStatsHint}</span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={he.admin.gameForm.teamScore} htmlFor="teamScore" error={fieldError(state, "teamScore")}>
          <Input id="teamScore" name="teamScore" inputMode="numeric" defaultValue={game?.teamScore ?? ""} disabled={disabled} className="num" />
        </Field>
        <Field label={he.admin.gameForm.opponentScore} htmlFor="opponentScore" error={fieldError(state, "opponentScore")}>
          <Input id="opponentScore" name="opponentScore" inputMode="numeric" defaultValue={game?.opponentScore ?? ""} disabled={disabled} className="num" />
        </Field>
      </div>
      <Button type="submit" disabled={disabled}>
        {he.actions.save}
      </Button>
    </form>
  );
}
