import type { Metadata } from "next";
import { StandingsPageClient } from "@/components/standings/standings-page-client";
import { he } from "@/config/strings";
import { getLeagueTable } from "@/lib/league/table";

export const metadata: Metadata = { title: he.standingsPage.title };

export default async function StandingsPage() {
  const initial = await getLeagueTable();
  return <StandingsPageClient initial={initial} />;
}
