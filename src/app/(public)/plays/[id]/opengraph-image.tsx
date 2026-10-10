import { exerciseCategoryLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { OG_SIZE, loadImage, renderShareCard } from "@/lib/og/card";
import { getMediaUrl, getPosterUrl } from "@/lib/storage/urls";
import { parseId } from "@/lib/utils/params";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = he.training.title;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const [play, team] = await Promise.all([id ? getData().getExercise(id) : null, getData().getTeam()]);
  if (!play) return renderShareCard({ title: team.name, subtitle: he.training.subtitle });

  const thumb = getMediaUrl(play.thumbnail ?? play.image) ?? (play.video ? getPosterUrl(play.video) : null);
  return renderShareCard({
    eyebrow: `${he.training.title} · ${exerciseCategoryLabels[play.category]}`,
    title: play.title,
    subtitle: play.description ?? undefined,
    badge: play.video ? { text: he.training.watch, tone: "team" } : undefined,
    image: await loadImage(thumb),
  });
}
