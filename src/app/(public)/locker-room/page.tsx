import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { FilterChips } from "@/components/common/filter-chips";
import { PageHeader } from "@/components/common/section-header";
import { FeedItem } from "@/components/locker-room/feed-item";
import { buttonVariants } from "@/components/ui/button";
import { postTypeLabels } from "@/config/labels";
import { siteConfig } from "@/config/site";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { funniestPostId } from "@/lib/reactions";
import { firstParam } from "@/lib/utils/params";
import type { PostType } from "@/types/domain";

export const metadata: Metadata = { title: he.locker.title, description: he.locker.subtitle };

const filterTypes: PostType[] = ["announcement", "milestone", "award", "play", "funny_moment", "highlight", "photo", "video", "quote"];

export default async function LockerRoomPage({ searchParams }: PageProps<"/locker-room">) {
  const sp = await searchParams;
  const rawType = firstParam(sp.type);
  const type = filterTypes.includes(rawType as PostType) ? (rawType as PostType) : undefined;
  const rawBefore = firstParam(sp.before);
  const before = rawBefore && !Number.isNaN(Date.parse(rawBefore)) ? rawBefore : undefined;
  const feed = await getData().getFeed({ type, before, limit: siteConfig.feedPageSize });
  const funniestId = funniestPostId(feed.items);

  const moreHref = feed.nextCursor
    ? `/locker-room?${new URLSearchParams({ ...(type ? { type } : {}), before: feed.nextCursor }).toString()}`
    : null;

  return (
    <PullToRefresh>
      <PageHeader title={`🔥 ${he.locker.title}`} subtitle={he.locker.subtitle} />
      <FilterChips
        label={he.admin.postForm.type}
        items={[
          { href: "/locker-room", label: he.locker.all, active: !type },
          ...filterTypes.map((t) => ({ href: `/locker-room?type=${t}`, label: postTypeLabels[t], active: t === type })),
        ]}
      />
      {feed.items.length ? (
        <div className="mx-auto max-w-2xl space-y-4">
          {feed.items.map((item) => (
            <FeedItem key={item.id} item={item} funniest={item.id === funniestId} />
          ))}
          {moreHref ? (
            <div className="pt-2 text-center">
              <Link href={moreHref} className={buttonVariants({ variant: "secondary" })}>
                {he.locker.loadMore}
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState emoji="🤫" title={he.empty.posts.title} text={he.empty.posts.text} />
      )}
    </PullToRefresh>
  );
}
