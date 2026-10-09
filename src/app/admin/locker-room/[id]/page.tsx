import Link from "next/link";
import { notFound } from "next/navigation";
import { PostForm } from "@/app/admin/locker-room/post-form";
import { loadAdminPost } from "@/lib/admin/posts";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";
import { parseId } from "@/lib/utils/params";

async function loadPost(id: number) {
  if (isDemoMode()) {
    const feed = await getAdminData().then((d) => d.getFeed({ limit: 200 }));
    return feed.items.find((p) => p.id === id) ?? null;
  }
  const client = await createSessionClient();
  return loadAdminPost(client, id);
}

export default async function EditPostPage({ params }: PageProps<"/admin/locker-room/[id]">) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) notFound();

  const post = await loadPost(id);
  if (!post) notFound();

  const data = await getAdminData();
  const [players, season, awards] = await Promise.all([
    data.getPlayers({ includeInactive: true }),
    data.getActiveSeason(),
    data.getAwards(),
  ]);
  const games = season ? await data.getGames(season.id) : [];

  return (
    <div className="space-y-4">
      <Link href="/admin/locker-room" className="text-sm text-muted hover:text-text">
        {he.actions.back}
      </Link>
      <h1 className="font-display text-2xl font-bold" data-user-content>
        {post.title ?? he.admin.posts}
      </h1>
      <PostForm post={post} players={players} games={games} awards={awards} demo={isDemoMode()} />
    </div>
  );
}
