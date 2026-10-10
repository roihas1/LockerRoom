import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { getSeasonContext } from "@/lib/data/season";
import { OG_SIZE, loadImage, renderShareCard } from "@/lib/og/card";
import { aggregateLines } from "@/lib/stats/aggregate";
import { getMediaUrl } from "@/lib/storage/urls";
import { parseId } from "@/lib/utils/params";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = he.fun.wrapped.cta;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const [player, ctx, team] = await Promise.all([id ? getData().getPlayer(id) : null, getSeasonContext(), getData().getTeam()]);
  if (!player) return renderShareCard({ title: team.name, subtitle: he.meta.defaultDescription });

  const agg = aggregateLines(player.id, ctx.lines.filter((l) => l.playerId === player.id));
  return renderShareCard({
    eyebrow: ctx.season ? he.home.season(ctx.season.name) : undefined,
    title: he.fun.wrapped.title(player.nickname || player.name),
    subtitle: agg.gp > 0 ? `${agg.points} ${he.stats.pointsLong} · ${agg.rebounds} ${he.stats.reboundsLong} · ${agg.assists} ${he.stats.assistsLong}` : undefined,
    badge: { text: he.fun.wrapped.cta, tone: "team" },
    image: await loadImage(getMediaUrl(player.photo)),
  });
}
