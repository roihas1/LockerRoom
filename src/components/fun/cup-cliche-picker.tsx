"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { PickClicheResult } from "@/app/api/cliches/route";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import type { CupCliche } from "@/lib/fun/cliches";
import { haptic } from "@/lib/utils/haptics";

const t = he.fun.cliche;

/** Quote card + "עוד אחת" — used on home and the dedicated page. */
export function CupClichePicker({
  initial,
  suggestHref,
}: {
  initial: CupCliche | null;
  /** Optional link under the button (e.g. home → open suggest accordion). */
  suggestHref?: string;
}) {
  const [current, setCurrent] = useState<CupCliche | null>(initial);
  const [picking, startPick] = useTransition();

  const giveMe = () =>
    startPick(async () => {
      haptic(12);
      try {
        const res = await fetch("/api/cliches?pick=1");
        const json = (await res.json()) as PickClicheResult;
        if (!json.ok) {
          toast.error(json.reason === "empty" ? t.empty : t.failed);
          return;
        }
        setCurrent(json.item);
      } catch {
        toast.error(t.failed);
      }
    });

  return (
    <section className="card court-bg space-y-5 p-6 text-center">
      <p className="text-xs font-bold tracking-wide text-team">{t.title}</p>
      {current ? (
        <blockquote className="space-y-3">
          <p data-user-content className="font-display text-2xl font-bold leading-snug text-balance">
            ״{current.body}״
          </p>
          <footer data-user-content className="text-sm text-muted">
            — {current.saidBy}
          </footer>
        </blockquote>
      ) : (
        <p className="text-muted">{t.empty}</p>
      )}
      <Button size="lg" className="w-full" onClick={giveMe} disabled={picking}>
        {current ? t.another : t.giveMe}
      </Button>
      {suggestHref ? (
        <Link href={suggestHref} className="inline-block text-sm font-semibold text-team hover:underline">
          {t.suggestTitle}
        </Link>
      ) : null}
    </section>
  );
}
