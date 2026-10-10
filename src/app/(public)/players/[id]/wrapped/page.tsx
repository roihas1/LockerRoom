import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MediaImage } from "@/components/common/media-image";
import { ShareButton } from "@/components/common/share-button";
import { shareMessage } from "@/lib/meta";
import { WrappedStories } from "@/components/fun/wrapped-stories";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { getSeasonContext } from "@/lib/data/season";
import { buildWrapped } from "@/lib/fun/wrapped";
import { parseId } from "@/lib/utils/params";

export async function generateMetadata({ params }: PageProps<"/players/[id]/wrapped">): Promise<Metadata> {
  const id = parseId((await params).id);
  const player = id ? await getData().getPlayer(id) : null;
  if (!player) return { title: he.empty.notFound.title };
  return { title: he.fun.wrapped.title(player.name), robots: { index: false } };
}

export default async function PlayerWrappedPage({ params }: PageProps<"/players/[id]/wrapped">) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const [player, ctx] = await Promise.all([getData().getPlayer(id), getSeasonContext()]);
  if (!player) notFound();

  const slides = buildWrapped({ playerId: id, games: ctx.games, lines: ctx.lines, aggregates: ctx.aggregates, completedGames: ctx.completed.length });
  if (!slides) notFound();

  return (
    <div className="py-2">
      <h1 className="sr-only">{he.fun.wrapped.title(player.name)}</h1>
      <WrappedStories
        slides={slides}
        playerName={player.nickname || player.name}
        hashtag={player.hashtag}
        backHref={`/players/${id}`}
        photo={<MediaImage media={player.photo} fallback="/placeholders/player.svg" alt={he.media.playerPhoto(player.name)} sizes="160px" priority />}
      />
      <div className="mt-4 flex justify-center">
        <ShareButton path={`/players/${id}/wrapped`} text={shareMessage.wrapped(player)} variant="primary" />
      </div>
    </div>
  );
}
