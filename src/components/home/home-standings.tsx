"use client";

import { useEffect, useState } from "react";
import { StandingsCard } from "@/components/home/standings-card";
import { fetchLeagueTableInBrowser } from "@/lib/league/table-client";
import type { LeagueTable } from "@/lib/league/table";

export function HomeStandings() {
  const [table, setTable] = useState<LeagueTable | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLeagueTableInBrowser().then((t) => {
      if (!cancelled) setTable(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!table) return null;

  return (
    <div className="md:max-w-md">
      <StandingsCard table={table} />
    </div>
  );
}
