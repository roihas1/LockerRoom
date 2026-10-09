import type { Season, Team } from "@/types/domain";
import { placeholderMedia } from "./media";

export const fixtureTeam: Team = {
  name: "בני הרצליה ״קליין״",
  shortName: "קליין",
  description: "קבוצת כדורסל חובבים שמשחקת בשביל הכיף, הניצחונות והפיצה אחרי המשחק.",
  primaryColor: "#2563eb",
  secondaryColor: "#ffffff",
  logo: placeholderMedia("logo", "image"),
  cover: placeholderMedia("cover", "image"),
};

export const fixtureSeasons: Season[] = [
  { id: 1, name: "2026/27", slug: "2026-27", startDate: "2026-09-01", endDate: "2027-06-30", isActive: true },
];
