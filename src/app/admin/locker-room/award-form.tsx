"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MediaUploadField } from "@/components/admin/media-upload-field";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { awardCategoryLabels } from "@/config/labels";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import type { Award, Game, Player, Season } from "@/types/domain";
import { deleteAwardAction, publishAwardAction, saveAwardAction } from "./actions";

function fieldError(state: ActionResult | null, key: string) {
  if (!state || state.ok) return undefined;
  const snake = key.replace(/([A-Z])/g, "_$1").toLowerCase();
  return state.fieldErrors?.[key] ?? state.fieldErrors?.[snake];
}

export function AwardForm({
  award,
  seasons,
  players,
  games,
  demo,
  linkedToFeed,
}: {
  award?: Award;
  seasons: Season[];
  players: Player[];
  games: Game[];
  demo: boolean;
  linkedToFeed: boolean;
}) {
  const router = useRouter();
  const [saveState, saveAction, savePending] = useActionState(saveAwardAction, null as ActionResult | null);
  const [pubState, pubAction, pubPending] = useActionState(publishAwardAction, null as ActionResult | null);
  const [delState, delAction, delPending] = useActionState(deleteAwardAction, null as ActionResult | null);

  useEffect(() => {
    if (saveState?.ok && saveState.redirectTo) router.push(saveState.redirectTo);
    if (delState?.ok && delState.redirectTo) router.push(delState.redirectTo);
  }, [saveState, delState, router]);

  const disabled = demo || savePending;
  const alert = [saveState, pubState, delState].find((s) => s && !s.ok);
  const success = [saveState, pubState].find((s) => s?.ok);

  const defaultSeason = award?.seasonId ?? seasons.find((s) => s.isActive)?.id ?? seasons[0]?.id;

  return (
    <div className="space-y-6">
      {alert ? (
        <p role="alert" className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {alert.message}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
          {success.message}
        </p>
      ) : null}

      <form action={saveAction} noValidate className="card space-y-4 p-5">
        {award ? <input type="hidden" name="awardId" value={award.id} /> : null}
        <Field label={he.admin.gameForm.season} htmlFor="seasonId">
          <Select id="seasonId" name="seasonId" defaultValue={defaultSeason ?? ""} disabled={disabled} required>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={he.admin.awardForm.title} htmlFor="title" error={fieldError(saveState, "title")}>
          <Input id="title" name="title" defaultValue={award?.title ?? ""} required disabled={disabled} data-user-content />
        </Field>
        <Field label={he.admin.awardForm.emoji} htmlFor="emoji">
          <Input id="emoji" name="emoji" defaultValue={award?.emoji ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={he.admin.awardForm.category} htmlFor="category">
          <Select id="category" name="category" defaultValue={award?.category ?? "fun"} disabled={disabled}>
            {(Object.keys(awardCategoryLabels) as (keyof typeof awardCategoryLabels)[]).map((key) => (
              <option key={key} value={key}>
                {awardCategoryLabels[key]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={he.admin.awardForm.description} htmlFor="description">
          <Textarea id="description" name="description" defaultValue={award?.description ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={he.admin.awardForm.player} htmlFor="playerId" error={fieldError(saveState, "playerId")}>
          <Select id="playerId" name="playerId" defaultValue={award?.playerId ?? ""} disabled={disabled} required>
            <option value="">{he.admin.gameForm.none}</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} data-user-content>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={he.admin.awardForm.game} htmlFor="gameId">
          <Select id="gameId" name="gameId" defaultValue={award?.gameId ?? ""} disabled={disabled}>
            <option value="">{he.admin.gameForm.none}</option>
            {games.map((g) => (
              <option key={g.id} value={g.id} data-user-content>
                {`${he.result.vs} ${g.opponent}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={he.admin.awardForm.date} htmlFor="awardedOn">
          <Input id="awardedOn" name="awardedOn" type="date" defaultValue={award?.awardedOn ?? ""} disabled={disabled} required />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="shareToFeed" defaultChecked={linkedToFeed} disabled={disabled} />
          {he.admin.awardForm.shareToFeed}
        </label>
        <MediaUploadField
          name="imageMediaId"
          label={he.admin.awardForm.image}
          scope="locker-room"
          defaultMedia={award?.image}
          disabled={disabled}
        />
        <Button type="submit" disabled={disabled}>
          {he.actions.save}
        </Button>
      </form>

      {award ? (
        <div className="flex flex-wrap gap-2">
          <form action={pubAction}>
            <input type="hidden" name="awardId" value={award.id} />
            <input type="hidden" name="publish" value={award.isPublished ? "false" : "true"} />
            <input type="hidden" name="shareToFeed" value={linkedToFeed ? "true" : "false"} />
            <Button type="submit" variant="secondary" disabled={demo || pubPending}>
              {award.isPublished ? he.actions.unpublish : he.actions.publish}
            </Button>
          </form>
          <form action={delAction}>
            <input type="hidden" name="awardId" value={award.id} />
            <Button type="submit" variant="danger" disabled={demo || delPending}>
              {he.actions.delete}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
