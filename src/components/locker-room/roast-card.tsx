import Link from "next/link";
import { he } from "@/config/strings";
import { isRoastPost, parseRoastBody, type ParsedRoastLine } from "@/lib/fun/roasts";
import { cn } from "@/lib/utils/cn";
import type { FeedItem, Player } from "@/types/domain";

function RoastLineRow({
  line,
  playersById,
}: {
  line: ParsedRoastLine;
  playersById?: Map<number, Pick<Player, "id" | "name" | "nickname">>;
}) {
  const player = line.playerId != null ? playersById?.get(line.playerId) : null;
  const isPraise = line.tone === "praise";
  const label = player ? player.nickname || player.name : null;
  const rest =
    label && line.text.startsWith(label) ? line.text.slice(label.length).replace(/^[\s:·,]+/, "") : line.text;

  return (
    <li
      className={cn(
        "flex gap-2 rounded-xl px-3 py-2.5 text-sm leading-relaxed",
        isPraise ? "bg-win/10 text-text" : "bg-surface-2 text-text/95",
      )}
    >
      <span aria-hidden className="shrink-0">
        {isPraise ? "✨" : "🔥"}
      </span>
      <span className="min-w-0">
        {player && label ? (
          <>
            <Link href={`/players/${player.id}`} className="font-bold text-team hover:underline" data-user-content>
              {label}
            </Link>
            {rest ? <span data-user-content> {rest}</span> : null}
          </>
        ) : (
          <span data-user-content>{line.text}</span>
        )}
      </span>
    </li>
  );
}

/** Dedicated roast presentation for feed / game / admin preview. */
export function RoastBody({
  body,
  playersById,
  compact = false,
  showIntro = true,
}: {
  body: string;
  playersById?: Map<number, Pick<Player, "id" | "name" | "nickname">>;
  compact?: boolean;
  showIntro?: boolean;
}) {
  const parsed = parseRoastBody(body);
  if (!parsed.lines.length && !parsed.intro) {
    return body ? (
      <p data-user-content className={cn("leading-relaxed whitespace-pre-line text-text/90", compact && "line-clamp-3")}>
        {body}
      </p>
    ) : null;
  }

  const lines = compact ? parsed.lines.slice(0, 3) : parsed.lines;

  return (
    <div className="space-y-3">
      {showIntro && parsed.intro ? (
        <p data-user-content className={cn("text-sm text-muted", compact && "line-clamp-2")}>
          {parsed.intro}
        </p>
      ) : null}
      <ul className="space-y-2">
        {lines.map((line, i) => (
          <RoastLineRow key={`${line.playerId ?? "t"}-${i}-${line.text.slice(0, 24)}`} line={line} playersById={playersById} />
        ))}
      </ul>
      {compact && parsed.lines.length > lines.length ? (
        <p className="text-xs font-semibold text-team">{he.fun.roast.toLockerPost}</p>
      ) : null}
    </div>
  );
}

/** True when this feed item should render with the roast card layout. */
export function feedItemIsRoast(item: FeedItem): boolean {
  return isRoastPost(item);
}
