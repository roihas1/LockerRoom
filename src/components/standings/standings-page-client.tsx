"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/section-header";
import { LeagueStandingsBlock } from "@/components/standings/league-standings-block";
import { he } from "@/config/strings";
import type { LeagueTable } from "@/lib/league/table";

export function StandingsPageClient({ initial }: { initial: LeagueTable | null }) {
  const [subtitle, setSubtitle] = useState(initial?.title);

  return (
    <>
      <PageHeader title={he.standingsPage.title} subtitle={subtitle} />
      <LeagueStandingsBlock initial={initial} onTitle={setSubtitle} />
    </>
  );
}
