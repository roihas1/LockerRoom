"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { he } from "@/config/strings";
import { useSwipe } from "@/lib/hooks/use-swipe";
import { haptic } from "@/lib/utils/haptics";

interface Neighbor {
  href: string;
  name: string;
}

/** Swipe (or tap the links) to move between roster profiles. RTL: next is to the left. */
export function SwipeNav({ prev, next, children }: { prev: Neighbor | null; next: Neighbor | null; children: ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  function go(target: Neighbor | null) {
    if (!target) return;
    haptic(8);
    router.push(target.href);
  }

  useSwipe(ref, { onSwipeRight: () => go(next), onSwipeLeft: () => go(prev) });

  return (
    <div ref={ref}>
      {children}
      {prev || next ? (
        <nav aria-label={he.roster.browse} className="mt-8 flex items-stretch justify-between gap-3">
          {prev ? (
            <Link href={prev.href} className="card flex min-w-0 items-center gap-2 p-3 text-sm hover:border-team/50">
              <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0">
                <span className="block text-xs text-muted">{he.roster.prevPlayer}</span>
                <span data-user-content className="block truncate font-bold">
                  {prev.name}
                </span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={next.href} className="card flex min-w-0 items-center gap-2 p-3 text-end text-sm hover:border-team/50">
              <span className="min-w-0">
                <span className="block text-xs text-muted">{he.roster.nextPlayer}</span>
                <span data-user-content className="block truncate font-bold">
                  {next.name}
                </span>
              </span>
              <ChevronLeft className="size-4 shrink-0 text-muted" aria-hidden />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
