import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { GameDetail } from "@/components/games/game-detail";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { gameShareText } from "@/lib/meta";
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
      <Link href="/games" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text">
        <ChevronRight className="size-4" aria-hidden />
        {he.nav.games}
      </Link>
      <GameDetail detail={detail} team={team} />
    </>
  );
}
