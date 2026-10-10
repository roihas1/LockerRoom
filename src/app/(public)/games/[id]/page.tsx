import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/common/back-link";
import { WinConfetti } from "@/components/fun/win-confetti";
import { GameDetail } from "@/components/games/game-detail";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { gameShareText } from "@/lib/meta";
import { gameResult } from "@/lib/stats/games";
import { parseId } from "@/lib/utils/params";

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
  const [detail, team] = await Promise.all([data.getGameDetail(id), data.getTeam()]);
  if (!detail) notFound();

  return (
    <>
      <BackLink href="/games" label={he.nav.games} className="mb-4" />
      <GameDetail detail={detail} team={team} />
      {gameResult(detail.game) === "win" ? <WinConfetti id={`game-${detail.game.id}`} /> : null}
    </>
  );
}
