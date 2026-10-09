"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  variant = "center",
  ...props
}: ComponentProps<typeof D.Content> & { title: string; description?: string; variant?: "center" | "sheet" }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
      <D.Content
        className={cn(
          "fixed z-50 border-border bg-surface text-text shadow-2xl focus:outline-none",
          variant === "center"
            ? "inset-x-0 top-1/2 mx-auto w-[calc(100%-2rem)] max-w-md -translate-y-1/2 rounded-2xl border p-5"
            : "inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t p-5 pb-safe",
          className,
        )}
        {...props}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <D.Title className="font-display text-lg font-bold">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-muted">{description}</D.Description> : null}
          </div>
          <D.Close className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text" aria-label={he.actions.close}>
            <X className="size-5" />
          </D.Close>
        </div>
        {children as ReactNode}
      </D.Content>
    </D.Portal>
  );
}
