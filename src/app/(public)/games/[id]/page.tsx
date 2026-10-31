import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/common/back-link";
import { ShareButton } from "@/components/common/share-button";
import { WinConfetti } from "@/components/fun/win-confetti";
import { GameDetail } from "@/components/games/game-detail";
import { he } from "@/config/strings";
import { getData, getFreshData } from "@/lib/data";
import { isInLiveWindow } from "@/lib/data/live-window";
import { gameShareText, shareMessage } from "@/lib/meta";
import { gameResult } from "@/lib/stats/games";
import { parseId } from "@/lib/utils/params";

// Rendered per request: a cached ISR page (and CDN copy) could otherwise keep showing "live" after the final whistle.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/games/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const data = getData();
  const [game, team] = await Promise.all([id ? data.getGame(id) : null, data.getTeam()]);
  if (!game) return { title: he.empty.notFound.title };
  const share = gameShareText(game, team);
  return {
    title: { absolute: share.title },
    description: share.description,
    openGraph: { title: share.title, description: share.description, type: "article" },
    twitter: { card: "summary_large_image", title: share.title, description: share.description },
  };
}

export default async function GamePage({ params }: PageProps<"/games/[id]">) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const data = getData();
  // Light probe first: decide cache vs fresh before paying for full game detail.
  const [probe, team] = await Promise.all([data.getGame(id), data.getTeam()]);
  if (!probe) notFound();
  // Around game time skip the ~60s cache so score, status and box score are never stale.
  const fresh = isInLiveWindow(probe);
  const source = fresh ? getFreshData() : data;
  const detail = await source.getGameDetail(id);
  if (!detail) notFound();
  const isLive = detail.game.status === "live";
  const isFinal = detail.game.status === "final";
  const [events, roast] = await Promise.all([
    isLive || isFinal ? source.getGameEvents(id) : Promise.resolve(undefined),
    isFinal ? data.getPublishedRoastForGame(id) : Promise.resolve(null),
  ]);
  const share = (
    <ShareButton
      path={`/games/${id}`}
      text={shareMessage.game(detail.game, team)}
      label={isLive ? he.share.shareLive : detail.game.status === "final" ? he.share.shareResult : he.share.share}
      variant={isLive ? "primary" : "secondary"}
    />
  );

  return (
    <>
      <BackLink href="/games" label={he.nav.games} className="mb-4" />
      <GameDetail detail={detail} team={team} events={events} actions={share} roast={roast} />
      {gameResult(detail.game) === "win" ? <WinConfetti id={`game-${detail.game.id}`} /> : null}
    </>
  );
}
