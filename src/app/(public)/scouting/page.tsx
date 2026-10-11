import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/common/section-header";
import { OpponentScoutingView } from "@/components/scouting/opponent-scouting-view";
import { he } from "@/config/strings";
import { defaultScoutingOpponent, getScoutingBundle, listSeasonOpponents } from "@/lib/league/scouting";
import { cn } from "@/lib/utils/cn";
import { firstParam } from "@/lib/utils/params";

export const metadata: Metadata = { title: he.scoutingPage.title, description: he.scoutingPage.subtitle };

export default async function ScoutingPage({ searchParams }: PageProps<"/scouting">) {
  const sp = await searchParams;
  const opponents = await listSeasonOpponents();
  const fallback = await defaultScoutingOpponent();
  const selected = firstParam(sp.opponent) ?? fallback ?? opponents[0] ?? null;
  const bundle = selected ? await getScoutingBundle(selected) : null;

  return (
    <>
      <PageHeader title={he.scoutingPage.title} subtitle={he.scoutingPage.subtitle} />
      {opponents.length ? (
        <nav aria-label={he.scoutingPage.selectOpponent} className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
          {opponents.map((name) => (
            <Link
              key={name}
              href={`/scouting?opponent=${encodeURIComponent(name)}`}
              scroll={false}
              data-user-content
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold whitespace-nowrap",
                name === selected ? "border-team bg-team/15 text-team" : "border-border text-muted hover:text-text",
              )}
            >
              {name}
            </Link>
          ))}
        </nav>
      ) : null}
      {bundle ? <OpponentScoutingView bundle={bundle} /> : null}
    </>
  );
}
