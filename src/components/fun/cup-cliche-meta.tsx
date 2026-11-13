import { he } from "@/config/strings";
import type { CupCliche } from "@/lib/fun/cliches";

const t = he.fun.cliche;

/** Date + source under a quote attribution. */
export function CupClicheMeta({ item, className }: { item: Pick<CupCliche, "saidOn" | "sourceUrl">; className?: string }) {
  if (!item.saidOn && !item.sourceUrl) return null;
  return (
    <p className={className ?? "text-xs text-muted"}>
      {item.saidOn ? (
        <span data-user-content>
          {t.saidOn}: {item.saidOn}
        </span>
      ) : null}
      {item.saidOn && item.sourceUrl ? <span aria-hidden> · </span> : null}
      {item.sourceUrl ? (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-team hover:underline"
          data-user-content
        >
          {t.source}
        </a>
      ) : null}
    </p>
  );
}
