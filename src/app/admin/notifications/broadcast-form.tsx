"use client";

import { Send } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import { sendBroadcastAction } from "./actions";
import { BROADCAST_LINKS } from "./links";

const t = he.admin.broadcast;

function fieldError(state: ActionResult | null, key: string) {
  return state && !state.ok ? state.fieldErrors?.[key] : undefined;
}

export function BroadcastForm({ devices, appName, disabled }: { devices: number; appName: string; disabled: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: ActionResult | null, formData: FormData) => {
    const result = await sendBroadcastAction(prev, formData);
    if (result.ok) {
      toast.success(result.message);
      setTitle("");
      setBody("");
    } else if (!result.fieldErrors) {
      toast.error(result.message);
    }
    return result;
  }, null);

  const canSend = !disabled && !pending && title.trim().length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <form
        ref={formRef}
        action={action}
        noValidate
        className="card space-y-4 p-5"
        onSubmit={(e) => {
          if (!confirmOpen) {
            e.preventDefault();
            if (canSend) setConfirmOpen(true);
          }
        }}
      >
        <Field label={t.titleLabel} htmlFor="title" error={fieldError(state, "title")}>
          <Input
            id="title"
            name="title"
            maxLength={120}
            placeholder={t.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
            required
            data-user-content
          />
        </Field>
        <Field label={t.bodyLabel} htmlFor="body" error={fieldError(state, "body")}>
          <Textarea
            id="body"
            name="body"
            maxLength={300}
            rows={3}
            placeholder={t.bodyPlaceholder}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={disabled}
            data-user-content
          />
        </Field>
        <Field label={t.linkLabel} htmlFor="url" error={fieldError(state, "url")}>
          <Select id="url" name="url" defaultValue="/" disabled={disabled}>
            {BROADCAST_LINKS.map((link) => (
              <option key={link.url} value={link.url}>
                {link.label}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={!canSend}>
          <Send aria-hidden />
          {t.send}
        </Button>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent title={t.confirm(devices)} description={title} data-user-content>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {he.actions.cancel}
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  formRef.current?.requestSubmit();
                  setConfirmOpen(false);
                }}
              >
                <Send aria-hidden />
                {t.send}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </form>

      <section aria-label={t.preview} className="space-y-2">
        <h2 className="text-sm font-semibold text-muted">{t.preview}</h2>
        <div className="rounded-3xl bg-gradient-to-b from-team/30 to-surface-2 p-4">
          <div className="flex items-start gap-3 rounded-2xl bg-surface/90 p-3 shadow-lg backdrop-blur">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/app-icon/192" alt="" width={40} height={40} className="size-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span className="truncate font-semibold" data-user-content>
                  {appName}
                </span>
                <span>{t.previewApp}</span>
              </div>
              <p className="truncate text-sm font-bold" data-user-content>
                {title || t.titlePlaceholder}
              </p>
              <p className="line-clamp-3 text-sm text-muted" data-user-content>
                {body || t.bodyPlaceholder}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
