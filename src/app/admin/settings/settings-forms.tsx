"use client";

import { useActionState } from "react";
import { MediaUploadField } from "@/components/admin/media-upload-field";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import type { Season, Team } from "@/types/domain";
import { createSeasonAction, saveTeamSettingsAction, setActiveSeasonAction } from "./actions";

function fieldError(state: ActionResult | null, key: string) {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[key];
}

function FormAlert({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (!state.ok) {
    return (
      <p role="alert" className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
        {state.message}
      </p>
    );
  }
  return (
    <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
      {state.message}
    </p>
  );
}

export function SettingsForms({ team, seasons, demo }: { team: Team; seasons: Season[]; demo: boolean }) {
  const [teamState, teamAction, teamPending] = useActionState(saveTeamSettingsAction, null as ActionResult | null);
  const [seasonState, seasonAction, seasonPending] = useActionState(createSeasonAction, null as ActionResult | null);
  const [activeState, activeAction, activePending] = useActionState(setActiveSeasonAction, null as ActionResult | null);

  const disabled = demo;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{he.admin.settingsForm.teamName}</h2>
        <FormAlert state={teamState} />
        <form action={teamAction} noValidate className="card space-y-4 p-5">
          <Field label={he.admin.settingsForm.teamName} htmlFor="name" error={fieldError(teamState, "name")}>
            <Input id="name" name="name" defaultValue={team.name} disabled={disabled || teamPending} data-user-content required />
          </Field>
          <Field label={he.admin.settingsForm.shortName} htmlFor="shortName" error={fieldError(teamState, "shortName")}>
            <Input id="shortName" name="shortName" defaultValue={team.shortName} disabled={disabled || teamPending} data-user-content required />
          </Field>
          <Field label={he.admin.settingsForm.description} htmlFor="description">
            <Textarea id="description" name="description" defaultValue={team.description ?? ""} disabled={disabled || teamPending} data-user-content />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={he.admin.settingsForm.primaryColor} htmlFor="primaryColor" error={fieldError(teamState, "primaryColor")}>
              <Input id="primaryColor" name="primaryColor" defaultValue={team.primaryColor} disabled={disabled || teamPending} className="num" required />
            </Field>
            <Field label={he.admin.settingsForm.secondaryColor} htmlFor="secondaryColor" error={fieldError(teamState, "secondaryColor")}>
              <Input id="secondaryColor" name="secondaryColor" defaultValue={team.secondaryColor} disabled={disabled || teamPending} className="num" required />
            </Field>
          </div>
          <MediaUploadField
            name="logoMediaId"
            label={he.admin.settingsForm.logo}
            scope="team"
            defaultMedia={team.logo}
            disabled={disabled || teamPending}
          />
          <MediaUploadField
            name="coverMediaId"
            label={he.admin.settingsForm.cover}
            scope="team"
            defaultMedia={team.cover}
            disabled={disabled || teamPending}
          />
          <Button type="submit" disabled={disabled || teamPending}>
            {he.actions.save}
          </Button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{he.admin.settingsForm.seasons}</h2>
        <FormAlert state={activeState} />
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {seasons.map((season) => (
            <li key={season.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-medium">{season.name}</p>
                <p className="text-xs text-muted">
                  {season.startDate} – {season.endDate}
                  {season.isActive ? ` · ${he.admin.settingsForm.active}` : ""}
                </p>
              </div>
              {!season.isActive ? (
                <form action={activeAction}>
                  <input type="hidden" name="seasonId" value={season.id} />
                  <Button type="submit" size="sm" variant="outline" disabled={disabled || activePending}>
                    {he.admin.settingsForm.makeActive}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{he.admin.settingsForm.newSeason}</h2>
        <FormAlert state={seasonState} />
        <form action={seasonAction} noValidate className="card space-y-4 p-5">
          <Field label={he.admin.settingsForm.seasonName} htmlFor="seasonName" error={fieldError(seasonState, "name")}>
            <Input id="seasonName" name="name" disabled={disabled || seasonPending} data-user-content required />
          </Field>
          <Field label={he.admin.settingsForm.seasonSlug} htmlFor="seasonSlug" error={fieldError(seasonState, "slug")}>
            <Input id="seasonSlug" name="slug" disabled={disabled || seasonPending} data-user-content required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={he.admin.settingsForm.startDate} htmlFor="startDate" error={fieldError(seasonState, "startDate")}>
              <Input id="startDate" name="startDate" type="date" disabled={disabled || seasonPending} required />
            </Field>
            <Field label={he.admin.settingsForm.endDate} htmlFor="endDate" error={fieldError(seasonState, "endDate")}>
              <Input id="endDate" name="endDate" type="date" disabled={disabled || seasonPending} required />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="makeActive" disabled={disabled || seasonPending} />
            {he.admin.settingsForm.makeActive}
          </label>
          <Button type="submit" disabled={disabled || seasonPending}>
            {he.actions.add}
          </Button>
        </form>
      </section>
    </div>
  );
}
