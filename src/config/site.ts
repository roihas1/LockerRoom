export const siteConfig = {
  timeZone: "Asia/Jerusalem",
  locale: "he-IL",
  /** Minimum share of completed games a player must appear in to qualify as a leader. */
  leaderMinGamesRatio: 0.5,
  feedPageSize: 10,
  galleryPageSize: 24,
  recentGamesCount: 4,
  defaultTeam: {
    name: "בני הרצליה ״קליין״",
    shortName: "קליין",
    primaryColor: "#2563eb",
    secondaryColor: "#ffffff",
  },
  /** IBBA (ibasketball.co.il) SportsPress IDs. The table ID changes every season. */
  league: {
    tableId: 1501342,
    teamId: 1498342,
  },
};

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function isIndexingAllowed(): boolean {
  return process.env.SITE_ALLOW_INDEXING === "true";
}
