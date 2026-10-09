import Link from "next/link";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";

export type GameWizardStep = "details" | "stats" | "highlights" | "media" | "review";

const steps: { id: GameWizardStep; label: string; enabled: boolean }[] = [
  { id: "details", label: he.admin.wizard.details, enabled: true },
  { id: "stats", label: he.admin.wizard.stats, enabled: true },
  { id: "highlights", label: he.admin.wizard.highlights, enabled: true },
  { id: "media", label: he.admin.wizard.media, enabled: false },
  { id: "review", label: he.admin.wizard.review, enabled: true },
];

export function GameWizardNav({ gameId, step }: { gameId: number; step: GameWizardStep }) {
  const enabledSteps = steps.filter((s) => s.enabled);
  const currentIndex = enabledSteps.findIndex((s) => s.id === step);

  return (
    <nav aria-label={he.admin.wizard.step(currentIndex + 1, enabledSteps.length)} className="space-y-3">
      <p className="text-sm text-muted">{he.admin.wizard.step(currentIndex + 1, enabledSteps.length)}</p>
      <ol className="flex flex-wrap gap-2">
        {steps.map((s) => {
          if (!s.enabled) {
            return (
              <li key={s.id}>
                <span className="inline-flex rounded-xl border border-dashed border-border px-3 py-1.5 text-xs text-muted">
                  {s.label} · {he.admin.comingSoon}
                </span>
              </li>
            );
          }
          const active = s.id === step;
          return (
            <li key={s.id}>
              <Link
                href={`/admin/games/${gameId}?step=${s.id}`}
                className={cn(
                  "inline-flex rounded-xl px-3 py-1.5 text-xs font-semibold",
                  active ? "bg-team text-black" : "bg-surface-2 text-muted hover:text-text",
                )}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
