import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { postTypeLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";

export default async function AdminLockerRoomPage() {
  const { items: posts } = await getAdminData().then((d) => d.getFeed({ limit: 100 }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{he.admin.posts}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/locker-room/awards">{he.admin.awards}</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/locker-room/new">{he.admin.newPost}</Link>
          </Button>
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted">{he.admin.noItems}</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={post.type === "play" && post.exerciseId ? `/admin/plays/${post.exerciseId}` : `/admin/locker-room/${post.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2">
                <span className="font-medium" data-user-content>
                  {post.title ?? postTypeLabels[post.type]}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">{postTypeLabels[post.type]}</span>
                  {post.isPinned ? <Badge tone="team">{he.locker.pinned}</Badge> : null}
                  <Badge tone={post.isPublished ? "win" : "neutral"}>{post.isPublished ? he.admin.published : he.admin.draft}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
