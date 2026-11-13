"use client";

import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { SubmitClicheResult } from "@/app/api/cliches/route";
import { CupClichePicker } from "@/components/fun/cup-cliche-picker";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { CLICHE_WEIGHT_BUCKETS, type CupCliche, type CupClicheWeightBucket } from "@/lib/fun/cliches";
import { haptic } from "@/lib/utils/haptics";
import { cn } from "@/lib/utils/cn";

const t = he.fun.cliche;

const weightLabels: Record<CupClicheWeightBucket, string> = {
  60: t.weightLow,
  80: t.weightMid,
  100: t.weightHigh,
};

export function CupClicheGenerator({ initial, openSuggest = false }: { initial: CupCliche | null; openSuggest?: boolean }) {
  const [suggestOpen, setSuggestOpen] = useState(openSuggest);
  const [submitting, startSubmit] = useTransition();
  const [body, setBody] = useState("");
  const [saidBy, setSaidBy] = useState("");
  const [weight, setWeight] = useState<CupClicheWeightBucket>(80);

  const submit = () =>
    startSubmit(async () => {
      try {
        const res = await fetch("/api/cliches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, saidBy, weight, deviceId: getOrCreateDeviceId() }),
        });
        const json = (await res.json()) as SubmitClicheResult;
        if (!json.ok) {
          const msg =
            json.reason === "rate_limited"
              ? t.rateLimited
              : json.reason === "duplicate"
                ? t.duplicate
                : json.reason === "demo"
                  ? t.demo
                  : json.reason === "invalid"
                    ? t.invalidChars
                    : t.failed;
          toast.error(msg);
          return;
        }
        toast.success(t.submitted);
        setBody("");
        setSaidBy("");
        setWeight(80);
        haptic([10, 40, 10]);
      } catch {
        toast.error(t.failed);
      }
    });

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <CupClichePicker initial={initial} />

      <details
        id="suggest-cliche"
        className="card group open:pb-0"
        open={suggestOpen}
        onToggle={(e) => setSuggestOpen(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-display text-lg font-bold marker:content-none [&::-webkit-details-marker]:hidden">
          <span>{t.suggestTitle}</span>
          <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-4 border-t border-border px-5 pt-4 pb-5">
          <p className="text-sm text-muted">{t.suggestHint}</p>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">{t.suggestBody}</span>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={120} required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">{t.suggestSaidBy}</span>
            <Input value={saidBy} onChange={(e) => setSaidBy(e.target.value)} maxLength={120} required />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">{t.suggestWeight}</legend>
            <div className="grid grid-cols-3 gap-2">
              {CLICHE_WEIGHT_BUCKETS.map((bucket) => (
                <button
                  key={bucket.weight}
                  type="button"
                  onClick={() => setWeight(bucket.weight)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors",
                    weight === bucket.weight ? "border-team bg-team/15 text-team" : "border-border hover:border-team/50",
                  )}
                >
                  {weightLabels[bucket.weight]}
                </button>
              ))}
            </div>
          </fieldset>
          <Button
            variant="secondary"
            className="w-full"
            onClick={submit}
            disabled={submitting || body.trim().length < 2 || saidBy.trim().length < 2}
          >
            {t.submit}
          </Button>
        </div>
      </details>
    </div>
  );
}
