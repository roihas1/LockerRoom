"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { LeagueTableView } from "@/components/standings/league-table-view";
import { he } from "@/config/strings";
import { fetchLeagueTableInBrowser } from "@/lib/league/table-client";
import type { LeagueTable } from "@/lib/league/table";

type Props = {
  /** SSR prefetch when Amplify can reach IBBA; prod usually null. */
  initial: LeagueTable | null;
  onTitle?: (title: string) => void;
};

export function LeagueStandingsBlock({ initial, onTitle }: Props) {
  const [table, setTable] = useState<LeagueTable | null>(initial?.rows.length ? initial : null);
  const [loading, setLoading] = useState(!initial?.rows.length);

  useEffect(() => {
    // The server copy is cached for up to 30 minutes (and can predate the latest results), while the home screen
    // always reads live from the browser. Show the server copy right away, then replace it with the live table
    // so both screens agree. If the live read fails, the server copy simply stays.
    if (initial?.rows.length) onTitle?.(initial.title);
    let cancelled = false;
    void (async () => {
      const loaded = await fetchLeagueTableInBrowser();
      if (cancelled) return;
      if (loaded) {
        setTable(loaded);
        onTitle?.(loaded.title);
      } else if (!initial?.rows.length) {
        setTable(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initial, onTitle]);

  if (loading) {
    return (
      <div className="card animate-pulse p-8 text-center text-sm text-muted" aria-busy="true">
        {he.standingsPage.loading}
      </div>
    );
  }

  if (!table) {
    return <EmptyState emoji="🏆" title={he.empty.standings.title} text={he.empty.standings.text} />;
  }

  return <LeagueTableView table={table} />;
}
