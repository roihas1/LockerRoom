"use client";

import { ArrowDown } from "lucide-react";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";

/** Clickable stats-table header; active column shows a descending arrow. */
export function SortableTh({
  label,
  abbr,
  active,
  onSort,
  align = "center",
  sticky,
}: {
  label: string;
  abbr?: string;
  active: boolean;
  onSort: () => void;
  align?: "start" | "center";
  sticky?: boolean;
}) {
  return (
    <th
      scope="col"
      aria-sort={active ? "descending" : "none"}
      className={cn("p-0 font-semibold", sticky && "sticky start-0 z-10 bg-surface-2", align === "start" ? "text-start" : "text-center")}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "flex w-full flex-col px-2.5 py-2.5 hover:text-text",
          align === "start" ? "items-start px-3" : "items-center",
          active && "text-team",
        )}
        aria-label={`${he.statsPage.sortBy} ${label}`}
      >
        <span className="flex items-center gap-0.5">
          {label}
          {active ? <ArrowDown className="size-3" aria-hidden /> : null}
        </span>
        {abbr ? <span className="text-[10px] tracking-wider opacity-70">{abbr}</span> : null}
      </button>
    </th>
  );
}
