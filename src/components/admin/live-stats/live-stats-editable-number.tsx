"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { he } from "@/config/strings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils/cn";

const MAX_VALUE = 999;

/** A number that turns into a numeric field when tapped, committing only whole values from 0 up. */
export function LiveStatsEditableNumber({
  value,
  label,
  onCommit,
  disabled,
  className,
}: {
  value: number;
  label: string;
  onCommit: (next: number) => void;
  disabled: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={`${label}: ${value}`}
        onClick={() => setDraft(String(value))}
        className={cn(
          "num rounded-lg px-2 underline decoration-border decoration-dashed underline-offset-4 enabled:hover:decoration-team disabled:no-underline",
          className,
        )}
      >
        {value}
      </button>
    );
  }

  const parsed = /^\d+$/.test(draft) ? Number(draft) : null;
  const valid = parsed !== null && parsed <= MAX_VALUE;
  const commit = () => {
    if (!valid) return;
    if (parsed !== value) onCommit(parsed);
    setDraft(null);
  };

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        commit();
      }}
    >
      <Input
        autoFocus
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        aria-invalid={!valid}
        value={draft}
        onChange={(e) => setDraft(e.target.value.trim())}
        onKeyDown={(e) => {
          if (e.key === "Escape") setDraft(null);
        }}
        className="num w-20 text-center text-xl font-bold"
      />
      <Button type="submit" variant="secondary" size="icon" disabled={!valid} aria-label={he.admin.liveStats.confirm}>
        <Check aria-hidden />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => setDraft(null)} aria-label={he.admin.liveStats.cancel}>
        <X aria-hidden />
      </Button>
    </form>
  );
}
