"use client";

import { useEffect, useState } from "react";
import { normalizeOpponentName } from "@/config/opponents";
import { he } from "@/config/strings";
import { fetchLeagueTableInBrowser } from "@/lib/league/table-client";
import type { StandingRow } from "@/lib/league/table";

export function OpponentStandingLine({
  opponent,
  initial,
}: {
  opponent: string;
  initial: StandingRow | null;
}) {
  const [standing, setStanding] = useState(initial);

  useEffect(() => {
    if (standing) return;
    let cancelled = false;
    void (async () => {
      const table = await fetchLeagueTableInBrowser();
      if (cancelled || !table) return;
      const norm = normalizeOpponentName(opponent);
      const row = table.rows.find((r) => normalizeOpponentName(r.name) === norm) ?? null;
      setStanding(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [opponent, standing]);

  if (!standing) return null;

  return (
    <p className="text-muted">
      {he.scoutingPage.record}: {he.home.standings.placeLabel}{" "}
      <span className="num font-bold text-team">{standing.pos || "–"}</span> ·{" "}
      <bdi dir="ltr" className="num">
        {standing.w}-{standing.l}
      </bdi>
    </p>
  );
}
