"use client";

import { useEffect, useState } from "react";
import { StandingsCard } from "@/components/home/standings-card";
import { fetchLeagueTableInBrowser } from "@/lib/league/table-client";
import type { LeagueTable } from "@/lib/league/table";

export function HomeStandings({ initial = null }: { initial?: LeagueTable | null }) {
  const [table, setTable] = useState<LeagueTable | null>(initial?.rows.length ? initial : null);

  useEffect(() => {
    // SSR-first: only fall back to the browser fetch when the server could not reach IBBA.
    if (initial?.rows.length) return;
    let cancelled = false;
    void fetchLeagueTableInBrowser().then((t) => {
      if (!cancelled) setTable(t);
    });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  if (!table) return null;

  return (
    <div className="md:max-w-md">
      <StandingsCard table={table} />
    </div>
  );
}
