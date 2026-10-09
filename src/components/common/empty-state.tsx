import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  emoji,
  title,
  text,
  action,
  className,
}: {
  emoji: string;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card flex flex-col items-center gap-2 px-6 py-10 text-center", className)}>
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <p className="font-display text-lg font-bold">{title}</p>
      {text ? <p className="max-w-xs text-sm text-muted">{text}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
