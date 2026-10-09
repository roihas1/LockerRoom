import Link from "next/link";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import type { Season } from "@/types/domain";

/** Link-based season switcher; renders nothing when only one season exists. */
export function SeasonSelect({ seasons, current, basePath, extraParams = {} }: { seasons: Season[]; current: Season | null; basePath: string; extraParams?: Record<string, string> }) {
  if (seasons.length < 2) return null;
  return (
    <nav aria-label={he.games.seasonSelect} className="flex flex-wrap gap-2">
      {seasons.map((s) => {
        const params = new URLSearchParams({ ...extraParams, season: s.slug });
        const active = s.id === current?.id;
        return (
          <Link
            key={s.id}
            href={`${basePath}?${params.toString()}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "num rounded-full border px-3 py-1 text-sm font-semibold",
              active ? "border-team bg-team/15 text-team" : "border-border text-muted hover:text-text",
            )}
          >
            {s.name}
          </Link>
        );
      })}
    </nav>
  );
}
