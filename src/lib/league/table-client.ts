import { siteConfig } from "@/config/site";
import { IBBA_API } from "@/lib/league/ibba-fetch";
import { parseLeagueTable, type LeagueTable } from "@/lib/league/table";

/**
 * Load league standings from the visitor's browser. IBBA often blocks AWS (Amplify SSR);
 * their API allows cross-origin GET from our site.
 */
export async function fetchLeagueTableInBrowser(): Promise<LeagueTable | null> {
  const { tableId, teamId } = siteConfig.league;
  try {
    const res = await fetch(`${IBBA_API}/tables/${tableId}`, {
      credentials: "omit",
      cache: "default",
    });
    if (!res.ok) return null;
    const table = parseLeagueTable(await res.json(), teamId);
    return table.rows.length ? table : null;
  } catch {
    return null;
  }
}
