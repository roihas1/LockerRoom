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
    if (initial?.rows.length) {
      onTitle?.(initial.title);
      return;
    }
    let cancelled = false;
    void (async () => {
      const loaded = await fetchLeagueTableInBrowser();
      if (cancelled) return;
      setTable(loaded);
      setLoading(false);
      if (loaded) onTitle?.(loaded.title);
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
