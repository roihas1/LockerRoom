"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MediaUploadField } from "@/components/admin/media-upload-field";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import type { Coach } from "@/types/domain";
import { saveCoachAction } from "./actions";

function fieldError(state: ActionResult | null, key: string) {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[key];
}

export function CoachForm({ coach, demo }: { coach?: Coach; demo: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveCoachAction, null as ActionResult | null);

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  const disabled = demo || pending;
  const f = he.admin.playerForm;

  return (
    <div className="space-y-6">
      {state && !state.ok ? (
        <p role="alert" className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
          {state.message}
        </p>
      ) : null}

      <form action={action} noValidate className="card space-y-4 p-5">
        {coach ? <input type="hidden" name="coachId" value={coach.id} /> : null}
        <Field label={f.name} htmlFor="name" error={fieldError(state, "name")}>
          <Input id="name" name="name" defaultValue={coach?.name ?? ""} required disabled={disabled} data-user-content />
        </Field>
        <Field label={he.admin.coachForm.role} htmlFor="role" hint={he.admin.coachForm.roleHint} error={fieldError(state, "role")}>
          <Input id="role" name="role" defaultValue={coach?.role ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={f.nickname} htmlFor="nickname" error={fieldError(state, "nickname")}>
          <Input id="nickname" name="nickname" defaultValue={coach?.nickname ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={f.hashtag} htmlFor="hashtag" hint={f.hashtagHint} error={fieldError(state, "hashtag")}>
          <Input id="hashtag" name="hashtag" defaultValue={coach?.hashtag ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={f.description} htmlFor="description" error={fieldError(state, "description")}>
          <Textarea id="description" name="description" defaultValue={coach?.description ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={f.intro} htmlFor="intro" hint={f.introHint} error={fieldError(state, "intro")}>
          <Textarea id="intro" name="intro" rows={2} defaultValue={coach?.intro ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={f.strength} htmlFor="strength" error={fieldError(state, "strength")}>
          <Input id="strength" name="strength" defaultValue={coach?.strength ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={f.weakness} htmlFor="weakness" error={fieldError(state, "weakness")}>
          <Input id="weakness" name="weakness" defaultValue={coach?.weakness ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={f.quote} htmlFor="quote" error={fieldError(state, "quote")}>
          <Input id="quote" name="quote" defaultValue={coach?.quote ?? ""} disabled={disabled} data-user-content />
        </Field>
        <Field label={f.sortOrder} htmlFor="sortOrder">
          <Input id="sortOrder" name="sortOrder" inputMode="numeric" defaultValue={coach?.sortOrder ?? 0} disabled={disabled} className="num" />
        </Field>
        <MediaUploadField name="photoMediaId" label={f.photo} scope="players" defaultMedia={coach?.photo} disabled={disabled} />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="isActive" defaultChecked={coach?.isActive ?? true} disabled={disabled} />
          {he.admin.coachForm.active}
        </label>
        <Button type="submit" disabled={disabled}>
          {he.actions.save}
        </Button>
      </form>
    </div>
  );
}
