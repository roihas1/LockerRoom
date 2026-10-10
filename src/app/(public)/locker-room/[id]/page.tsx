import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/common/back-link";
import { ShareButton } from "@/components/common/share-button";
import { FeedItem } from "@/components/locker-room/feed-item";
import { postTypeLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { shareMessage } from "@/lib/meta";
import { parseId } from "@/lib/utils/params";

export async function generateMetadata({ params }: PageProps<"/locker-room/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const item = id ? await getData().getFeedItem(id) : null;
  if (!item) return { title: he.empty.notFound.title };
  const title = item.title ?? postTypeLabels[item.type];
  const description = item.body?.slice(0, 160) ?? he.locker.subtitle;
  return { title, description, openGraph: { title, description, type: "article" } };
}

export default async function PostPage({ params }: PageProps<"/locker-room/[id]">) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const item = await getData().getFeedItem(id);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <BackLink href="/locker-room" label={he.locker.title} />
        <ShareButton path={`/locker-room/${item.id}`} text={shareMessage.post(item)} />
      </div>
      <FeedItem item={item} />
    </div>
  );
}
