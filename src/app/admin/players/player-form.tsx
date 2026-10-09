"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MediaUploadField } from "@/components/admin/media-upload-field";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { positionLabels } from "@/config/labels";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import type { Player } from "@/types/domain";
import { savePlayerAction, setPlayerActiveAction } from "./actions";

function fieldError(state: ActionResult | null, key: string) {
  if (!state || state.ok) return undefined;
  const camel = key;
  const snake = key.replace(/([A-Z])/g, "_$1").toLowerCase();
  return state.fieldErrors?.[camel] ?? state.fieldErrors?.[snake];
}

export function PlayerForm({ player, demo }: { player?: Player; demo: boolean }) {
  const router = useRouter();
  const [saveState, saveAction, savePending] = useActionState(savePlayerAction, null as ActionResult | null);
  const [activeState, activeAction, activePending] = useActionState(setPlayerActiveAction, null as ActionResult | null);

  useEffect(() => {
    const state = saveState?.ok && saveState.redirectTo ? saveState : null;
    if (state?.redirectTo) router.push(state.redirectTo);
  }, [saveState, router]);

  const disabled = demo || savePending;

  return (
    <div className="space-y-6">
      {(saveState && !saveState.ok) || (activeState && !activeState.ok) ? (
        <p role="alert" className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {(saveState && !saveState.ok ? saveState : activeState)?.message}
        </p>
      ) : null}
      {saveState?.ok ? (
        <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
          {saveState.message}
        </p>
      ) : null}

      <form action={saveAction} noValidate className="card space-y-4 p-5">
        {player ? <input type="hidden" name="playerId" value={player.id} /> : null}
        <Field label={he.admin.playerForm.name} htmlFor="name" error={fieldError(saveState, "name")}>
          <Input id="name" name="name" defaultValue={player?.name ?? ""} required disabled={disabled} data-user-content />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={he.admin.playerForm.jersey} htmlFor="jerseyNumber" error={fieldError(saveState, "jerseyNumber")}>
            <Input id="jerseyNumber" name="jerseyNumber" inputMode="numeric" defaultValue={player?.jerseyNumber ?? ""} disabled={disabled} className="num" />
          </Field>
          <Field label={he.admin.playerForm.height} htmlFor="heightCm" error={fieldError(saveState, "heightCm")}>
            <Input id="heightCm" name="heightCm" inputMode="numeric" defaultValue={player?.heightCm ?? ""} disabled={disabled} className="num" />
          </Field>
        </div>
        <Field label={he.admin.playerForm.position} htmlFor="position">
          <Select id="position" name="position" defaultValue={player?.position ?? ""} disabled={disabled}>
            <option value="">{he.admin.gameForm.none}</option>
            {(Object.keys(positionLabels) as (keyof typeof positionLabels)[]).map((key) => (
              <option key={key} value={key}>
                {positionLabels[key]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={he.admin.playerForm.nickname} htmlFor="nickname">
          <Input id="nickname" name="nickname" defaultValue={player?.nickname ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={he.admin.playerForm.teamRole} htmlFor="teamRole">
          <Input id="teamRole" name="teamRole" defaultValue={player?.teamRole ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={he.admin.playerForm.description} htmlFor="description">
          <Textarea id="description" name="description" defaultValue={player?.description ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={he.admin.playerForm.strength} htmlFor="strength">
          <Input id="strength" name="strength" defaultValue={player?.strength ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={he.admin.playerForm.weakness} htmlFor="weakness">
          <Input id="weakness" name="weakness" defaultValue={player?.weakness ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={he.admin.playerForm.quote} htmlFor="quote">
          <Input id="quote" name="quote" defaultValue={player?.quote ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={he.admin.playerForm.sortOrder} htmlFor="sortOrder">
          <Input id="sortOrder" name="sortOrder" inputMode="numeric" defaultValue={player?.sortOrder ?? 0} disabled={disabled} className="num" />
        </Field>
        <MediaUploadField
          name="photoMediaId"
          label={he.admin.playerForm.photo}
          scope="players"
          defaultMedia={player?.photo}
          disabled={disabled}
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="isActive" defaultChecked={player?.isActive ?? true} disabled={disabled} />
          {he.admin.playerForm.active}
        </label>
        <Button type="submit" disabled={disabled}>
          {he.actions.save}
        </Button>
      </form>

      {player ? (
        <form action={activeAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="playerId" value={player.id} />
          <input type="hidden" name="active" value={player.isActive ? "false" : "true"} />
          <Button type="submit" variant={player.isActive ? "danger" : "secondary"} disabled={demo || activePending}>
            {player.isActive ? he.admin.deactivate : he.admin.activate}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
