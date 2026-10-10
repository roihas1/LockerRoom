import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  href: string;
  label: string;
  /** Mark the label as user content (e.g. an opponent name) for the Hebrew checker. */
  userContent?: boolean;
  className?: string;
}

export function BackLink({ href, label, userContent, className }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 max-w-full items-center gap-1 rounded-full border border-border bg-surface/70 ps-2 pe-3.5 text-sm font-semibold text-muted transition hover:border-team/40 hover:text-text focus-visible:outline-2 focus-visible:outline-team active:scale-95",
        className,
      )}
    >
      <ChevronRight className="size-4 shrink-0" aria-hidden />
      <span data-user-content={userContent || undefined} className="truncate">
        {label}
      </span>
    </Link>
  );
}
