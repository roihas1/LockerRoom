"use client";

import { RotateCw } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import { resendBroadcastAction } from "./actions";

const t = he.admin.broadcast;

export function ResendButton({ broadcastId, title, devices, disabled }: { broadcastId: number; title: string; devices: number; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [, action, pending] = useActionState(async (prev: ActionResult | null, formData: FormData) => {
    const result = await resendBroadcastAction(prev, formData);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
    setOpen(false);
    return result;
  }, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm" disabled={disabled || pending}>
          <RotateCw aria-hidden />
          {t.resend}
        </Button>
      </DialogTrigger>
      <DialogContent title={t.resendConfirm(devices)} description={title} data-user-content>
        <form action={action} className="flex justify-end gap-2">
          <input type="hidden" name="broadcastId" value={broadcastId} />
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {he.actions.cancel}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={pending}>
            <RotateCw aria-hidden />
            {t.resend}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
