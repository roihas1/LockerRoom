import { CupClichePicker } from "@/components/fun/cup-cliche-picker";
import type { CupCliche } from "@/lib/fun/cliches";

/** Full cliché card on home while a cup game is on the schedule. */
export function CupClicheHomeCard({ initial }: { initial: CupCliche | null }) {
  return (
    <div className="mx-auto max-w-lg">
      <CupClichePicker initial={initial} suggestHref="/cup-cliches?suggest=1" />
    </div>
  );
}
