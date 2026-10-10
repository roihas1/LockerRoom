import { postTypeLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { OG_SIZE, loadImage, renderShareCard } from "@/lib/og/card";
import { getMediaUrl } from "@/lib/storage/urls";
import { parseId } from "@/lib/utils/params";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = he.locker.title;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const [item, team] = await Promise.all([id ? getData().getFeedItem(id) : null, getData().getTeam()]);
  if (!item) return renderShareCard({ title: team.name, subtitle: he.locker.subtitle });

  const player = item.milestonePlayer ?? item.awardPlayer ?? item.quotePlayer;
  const firstImage = item.media.find((m) => m.kind === "image") ?? null;
  const title =
    item.type === "quote" && item.body
      ? `״${item.body}״`
      : item.type === "award" && item.award
        ? item.award.title
        : (item.title ?? item.body ?? postTypeLabels[item.type]);
  const subtitle =
    item.type === "award" && player
      ? `${he.locker.awardTo}${player.name}`
      : item.type === "quote" && player
        ? `— ${player.name}`
        : item.title && item.body
          ? item.body
          : undefined;

  return renderShareCard({
    eyebrow: item.type === "milestone" ? he.milestones.title : `${he.locker.title} · ${postTypeLabels[item.type]}`,
    title,
    subtitle,
    badge: item.type === "milestone" || item.type === "award" ? { text: postTypeLabels[item.type], tone: "team" } : undefined,
    image: await loadImage(getMediaUrl(player?.photo ?? firstImage)),
  });
}
