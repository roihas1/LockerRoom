import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { OG_SIZE, renderShareCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = he.app.join.title;

export default async function Image() {
  const team = await getData().getTeam();
  return renderShareCard({
    eyebrow: he.app.join.title,
    title: team.name,
    subtitle: he.app.join.subtitle,
  });
}
