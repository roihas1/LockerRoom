"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MediaUploadField } from "@/components/admin/media-upload-field";
import { StringListField } from "@/components/admin/string-list-field";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { difficultyLabels, exerciseCategoryLabels, exerciseCategoryOrder } from "@/config/labels";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import type { Exercise } from "@/types/domain";
import { deleteExerciseAction, publishExerciseAction, saveExerciseAction } from "./actions";

function fieldError(state: ActionResult | null, key: string): string | undefined {
  if (!state || state.ok) return undefined;
  const snake = key.replace(/([A-Z])/g, "_$1").toLowerCase();
  const err = state.fieldErrors?.[key] ?? state.fieldErrors?.[snake];
  return err?.[0];
}

export function ExerciseForm({ exercise, demo }: { exercise?: Exercise; demo: boolean }) {
  const router = useRouter();
  const [saveState, saveAction, savePending] = useActionState(saveExerciseAction, null as ActionResult | null);
  const [pubState, pubAction, pubPending] = useActionState(publishExerciseAction, null as ActionResult | null);
  const [delState, delAction, delPending] = useActionState(deleteExerciseAction, null as ActionResult | null);

  useEffect(() => {
    if (saveState?.ok && saveState.redirectTo) router.push(saveState.redirectTo);
    if (delState?.ok && delState.redirectTo) router.push(delState.redirectTo);
  }, [saveState, delState, router]);

  const disabled = demo || savePending;
  const alert = [saveState, pubState, delState].find((s) => s && !s.ok);
  const success = [saveState, pubState].find((s) => s?.ok);

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
      {exercise && !exercise.isPublished ? (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">{he.admin.playDraftNotice}</p>
      ) : null}

      <form action={saveAction} noValidate className="space-y-4">
        {exercise ? <input type="hidden" name="exerciseId" value={exercise.id} /> : null}
        <input type="hidden" name="durationMinutes" value="" />

        <fieldset className="card space-y-4 p-5">
          <Field label={he.admin.exerciseForm.title} htmlFor="title" error={fieldError(saveState, "title")}>
            <Input id="title" name="title" defaultValue={exercise?.title ?? ""} required disabled={disabled} data-user-content />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={he.admin.exerciseForm.category} htmlFor="category" error={fieldError(saveState, "category")}>
              <Select id="category" name="category" defaultValue={exercise?.category ?? ""} disabled={disabled} required>
                <option value="">{he.admin.gameForm.none}</option>
                {exerciseCategoryOrder.map((key) => (
                  <option key={key} value={key}>
                    {exerciseCategoryLabels[key]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={he.admin.exerciseForm.difficulty} htmlFor="difficulty">
              <Select id="difficulty" name="difficulty" defaultValue={exercise?.difficulty ?? ""} disabled={disabled}>
                <option value="">{he.admin.gameForm.none}</option>
                {(Object.keys(difficultyLabels) as (keyof typeof difficultyLabels)[]).map((key) => (
                  <option key={key} value={key}>
                    {difficultyLabels[key]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={he.admin.exerciseForm.description} htmlFor="description" hint={he.admin.exerciseForm.descriptionHint}>
            <Textarea id="description" name="description" defaultValue={exercise?.description ?? ""} disabled={disabled} data-user-content />
          </Field>
        </fieldset>

        <fieldset className="card space-y-4 p-5">
          <StringListField
            name="instructions"
            label={he.admin.exerciseForm.instructions}
            hint={he.admin.exerciseForm.instructionsHint}
            defaultItems={exercise?.instructions ?? []}
            disabled={disabled}
            error={fieldError(saveState, "instructions")}
          />
          <StringListField
            name="coachingPoints"
            label={he.admin.exerciseForm.coachingPoints}
            hint={he.admin.exerciseForm.coachingPointsHint}
            defaultItems={exercise?.coachingPoints ?? []}
            disabled={disabled}
            error={fieldError(saveState, "coachingPoints")}
          />
        </fieldset>

        <fieldset className="card space-y-4 p-5">
          <MediaUploadField
            name="videoMediaId"
            label={he.admin.exerciseForm.video}
            scope="exercises"
            accept="video"
            defaultMedia={exercise?.video}
            disabled={disabled}
          />
          <MediaUploadField
            name="thumbnailMediaId"
            label={he.admin.exerciseForm.thumbnail}
            scope="exercises"
            defaultMedia={exercise?.thumbnail}
            disabled={disabled}
          />
          <Field label={he.admin.playerForm.sortOrder} htmlFor="sortOrder">
            <Input id="sortOrder" name="sortOrder" inputMode="numeric" defaultValue={exercise?.sortOrder ?? 0} disabled={disabled} className="num" />
          </Field>
        </fieldset>

        {exercise?.isPublished ? (
          <Button type="submit" disabled={disabled}>
            {he.actions.save}
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="intent" value="publish" disabled={disabled}>
              {he.admin.saveAndPublish}
            </Button>
            <Button type="submit" name="intent" value="draft" variant="secondary" disabled={disabled}>
              {he.actions.saveDraft}
            </Button>
          </div>
        )}
      </form>

      {exercise ? (
        <div className="flex flex-wrap gap-2">
          <form action={pubAction}>
            <input type="hidden" name="exerciseId" value={exercise.id} />
            <input type="hidden" name="publish" value={exercise.isPublished ? "false" : "true"} />
            <Button type="submit" variant="secondary" disabled={demo || pubPending}>
              {exercise.isPublished ? he.actions.unpublish : he.actions.publish}
            </Button>
          </form>
          <form action={delAction}>
            <input type="hidden" name="exerciseId" value={exercise.id} />
            <Button type="submit" variant="danger" disabled={demo || delPending}>
              {he.actions.delete}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
