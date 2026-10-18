import Link from "next/link";
import { ChevronLeft, Pin, Play } from "lucide-react";
import { MediaImage } from "@/components/common/media-image";
import { ShareButton } from "@/components/common/share-button";
import { ActionGallery } from "@/components/media/action-gallery";
import { Badge } from "@/components/ui/badge";
import { ReactionBar } from "./reaction-bar";
import { RoastBody, feedItemIsRoast } from "./roast-card";
import { awardCategoryLabels, exerciseCategoryLabels, postTypeLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/dates";
import type { FeedItem as FeedItemData } from "@/types/domain";

const typeEmoji: Record<FeedItemData["type"], string> = {
  announcement: "📣",
  photo: "📸",
  video: "🎥",
  funny_moment: "😂",
  quote: "🗣",
  highlight: "🔥",
  award: "🏆",
  play: "📋",
  milestone: "🎖️",
};

/** Where a feed card leads: plays already link to their play page from the card body. */
export function feedItemHref(item: FeedItemData): string {
  return item.type === "play" && item.play ? `/plays/${item.play.id}` : `/locker-room/${item.id}`;
}

export function FeedItem({
  item,
  compact = false,
  funniest = false,
  linked = false,
}: {
  item: FeedItemData;
  compact?: boolean;
  funniest?: boolean;
  /** Make the whole card a link to the post; inner links and buttons stay clickable on top of it. */
  linked?: boolean;
}) {
  const layer = linked ? "relative z-10 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto" : undefined;
  return (
    <article
      className={cn(
        "card overflow-hidden",
        item.isPinned && "border-team/40",
        funniest && "border-warning/40",
        linked && "relative transition-colors hover:border-team/50",
      )}
    >
      {linked ? <Link href={feedItemHref(item)} aria-label={item.title ?? he.locker.openPost} className="absolute inset-0 z-0" /> : null}
      <header className={cn("flex items-center justify-between gap-2 px-4 pt-4 text-xs text-muted", layer)}>
        <span className="flex flex-wrap items-center gap-1.5 font-semibold">
          <span aria-hidden>{typeEmoji[item.type]}</span>
          {postTypeLabels[item.type]}
          {item.isPinned ? (
            <Badge tone="team" className="ms-1">
              <Pin className="size-3" aria-hidden />
              {he.locker.pinned}
            </Badge>
          ) : null}
          {funniest ? (
            <Badge tone="warning" className="ms-1">
              <span aria-hidden>😂</span>
              {he.fun.reactions.funniest}
            </Badge>
          ) : null}
        </span>
        <time dateTime={item.publishedAt} className="num">
          {formatShortDate(item.publishedAt)}
        </time>
      </header>
      <div className={cn("p-4 pt-3", layer)}>{renderBody(item, compact)}</div>
      <footer className={cn("flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs", layer)}>
        <ReactionBar postId={item.id} initial={item.reactions} />
        {item.game ? (
          <Link href={`/games/${item.game.id}`} className="font-semibold text-team hover:underline">
            {he.result.vs} <span data-user-content>{item.game.opponent}</span>
          </Link>
        ) : null}
      </footer>
    </article>
  );
}

function renderBody(item: FeedItemData, compact: boolean) {
  if (item.type === "award" && item.award) {
    const player = item.awardPlayer;
    return (
      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
          <MediaImage media={player?.photo} fallback="/placeholders/player.svg" alt={player ? he.media.playerPhoto(player.name) : ""} sizes="64px" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted">{awardCategoryLabels[item.award.category]}</p>
          <p className="font-display text-lg font-extrabold">
            <span aria-hidden>{item.award.emoji} </span>
            <span data-user-content>{item.award.title}</span>
          </p>
          {player ? (
            <Link href={`/players/${player.id}`} className="text-sm font-semibold text-team hover:underline">
              {he.locker.awardTo}
              <span data-user-content>{player.name}</span>
            </Link>
          ) : null}
          {item.award.description && !compact ? (
            <p data-user-content className="mt-1 text-sm text-muted">
              {item.award.description}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (item.type === "milestone") {
    const player = item.milestonePlayer;
    return (
      <div className="flex items-center gap-4 rounded-2xl bg-linear-to-l from-warning/15 to-transparent p-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
          {player ? (
            <MediaImage media={player.photo} fallback="/placeholders/player.svg" alt={he.media.playerPhoto(player.name)} sizes="64px" />
          ) : (
            <span className="flex size-full items-center justify-center text-3xl" aria-hidden>
              🏆
            </span>
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-bold text-warning">{he.milestones.title}</p>
          <h3 data-user-content className="font-display text-lg leading-snug font-extrabold">
            {item.title}
          </h3>
          {item.body && !compact ? (
            <p data-user-content className="text-sm text-muted">
              {item.body}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {player ? (
              <Link href={`/players/${player.id}`} className="text-sm font-semibold text-team hover:underline">
                {he.milestones.toPlayer}
              </Link>
            ) : null}
            <ShareButton path={`/locker-room/${item.id}`} text={he.share.postText(item.title ?? he.milestones.title)} variant="ghost" />
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "play" && item.play) {
    const play = item.play;
    return (
      <Link href={`/plays/${play.id}`} className="group block space-y-3">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-2">
          <MediaImage
            media={play.thumbnail ?? play.image}
            fallback="/placeholders/exercise.svg"
            alt=""
            sizes="(min-width: 768px) 33vw, 100vw"
          />
          {play.video ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/25">
              <span className="flex size-12 items-center justify-center rounded-full bg-team text-black shadow-lg transition-transform group-hover:scale-110">
                <Play className="size-5 fill-current" aria-hidden />
              </span>
            </span>
          ) : null}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-team">{exerciseCategoryLabels[play.category]}</p>
          <h3 data-user-content className="font-display text-lg font-extrabold">
            {play.title}
          </h3>
          {play.description ? (
            <p data-user-content className={cn("text-sm leading-relaxed text-muted", compact && "line-clamp-2")}>
              {play.description}
            </p>
          ) : null}
          <span className="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-team group-hover:underline">
            {he.training.watch}
            <ChevronLeft className="size-4" aria-hidden />
          </span>
        </div>
      </Link>
    );
  }

  if (item.type === "quote") {
    return (
      <figure>
        <blockquote data-user-content className="font-display text-xl leading-snug font-bold">
          ״{item.body}״
        </blockquote>
        {item.quotePlayer ? (
          <figcaption className="mt-2 text-sm text-muted">
            —{" "}
            <Link href={`/players/${item.quotePlayer.id}`} className="font-semibold text-team hover:underline">
              <span data-user-content>{item.quotePlayer.name}</span>
            </Link>
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (feedItemIsRoast(item) && item.body) {
    return (
      <div className="space-y-3">
        {item.title ? (
          <h3 data-user-content className="font-display text-lg font-extrabold">
            {item.title}
          </h3>
        ) : null}
        <RoastBody
          body={item.body}
          compact={compact}
          playersById={new Map(item.mentionedPlayers.map((p) => [p.id, p]))}
        />
      </div>
    );
  }

  const media = compact ? item.media.slice(0, 1) : item.media;
  return (
    <div className="space-y-3">
      {item.title ? (
        <h3 data-user-content className="font-display text-lg font-extrabold">
          {item.title}
        </h3>
      ) : null}
      {item.body ? (
        <p data-user-content className={cn("leading-relaxed whitespace-pre-line text-text/90", compact && "line-clamp-2")}>
          {item.body}
        </p>
      ) : null}
      {media.length ? <ActionGallery media={media} columns={2} /> : null}
    </div>
  );
}
