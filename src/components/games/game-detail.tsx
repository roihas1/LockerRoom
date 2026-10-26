import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ResultBadge } from "@/components/common/result-badge";
import { ScoreBoard } from "@/components/common/scoreboard";
import { SectionHeader } from "@/components/common/section-header";
import { RoastBody } from "@/components/locker-room/roast-card";
import { ActionGallery } from "@/components/media/action-gallery";
import { VideoPlayer } from "@/components/media/video-player";
import { homeAwayLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { isCalendarEligible } from "@/lib/calendar";
import { isUpcomingGame } from "@/lib/stats/games";
import { formatLongDate, formatTime, formatWeekday } from "@/lib/utils/dates";
import type { ReactNode } from "react";
import type { FeedItem, GameDetailData, GameEvent, Team } from "@/types/domain";
import { AddToCalendar } from "./add-to-calendar";
import { BoxScoreTable } from "./box-score-table";
import { LiveGameSubscriber } from "./live-game-subscriber";
import { PlayByPlay } from "./play-by-play";
import { WazeButton } from "./waze-button";
import { PlayerOfGameCard } from "./player-of-game-card";
import { TeamTotals } from "./team-totals";

/**
 * Full game page body. Shared by the public game page and the admin review step.
 * Pass `events` (public page) for live/final play-by-play; live games also get realtime refresh.
 */
export function GameDetail({
  detail,
  team,
  events,
  actions,
  roast,
}: {
  detail: GameDetailData;
  team: Team;
  events?: GameEvent[];
  actions?: ReactNode;
  roast?: FeedItem | null;
}) {
  const { game, lines, players, media, playOfGame } = detail;
  const potg = players.find((p) => p.id === game.playerOfGameId) ?? null;
  const photos = media.filter((m) => m.kind === "image");
  const videos = media.filter((m) => m.kind === "video" && m.id !== playOfGame?.id);
  const isFinal = game.status === "final";
  const isLive = game.status === "live" && events !== undefined;
  const showStats = isFinal || isLive;
  // Live always shows (empty CTA while waiting); final only when live stats left a trail.
  const showPlayByPlay = isLive || (isFinal && !!events?.length);

  return (
    <article className="space-y-8">
      <header className="card court-bg overflow-hidden p-5 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span className="font-semibold">
            {game.roundNumber ? he.games.round(game.roundNumber) : null}
            {game.roundNumber ? " · " : null}
            {homeAwayLabels[game.homeAway]}
          </span>
          {isLive ? <LiveGameSubscriber gameId={game.id} /> : <ResultBadge game={game} />}
        </div>
        <ScoreBoard game={game} team={team} size="lg" />
        <dl className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            <dt className="sr-only">{he.admin.gameForm.date}</dt>
            <dd>
              {formatWeekday(game.tipoffAt)} · {formatLongDate(game.tipoffAt)}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            <dt className="sr-only">{he.games.tipoff}</dt>
            <dd className="num">{formatTime(game.tipoffAt)}</dd>
          </div>
          {game.location ? (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden />
              <dt className="sr-only">{he.games.location}</dt>
              <dd data-user-content>{game.location}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href={`/scouting?opponent=${encodeURIComponent(game.opponent)}`}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-team hover:bg-team/10"
          >
            {he.scoutingPage.viewScouting}
          </Link>
          {isCalendarEligible(game) ? <AddToCalendar game={game} team={team} /> : null}
          {game.location && isUpcomingGame(game) ? <WazeButton address={game.location} /> : null}
          {actions}
        </div>
      </header>

      {/* Live: play-by-play stays near the top. Final: pushed below so POTG / box score lead. */}
      {showPlayByPlay && isLive && events ? (
        <section>
          <SectionHeader title={he.live.playByPlay} icon={<span aria-hidden>🔴</span>} />
          <PlayByPlay events={events} players={players} />
        </section>
      ) : null}

      {potg ? (
        <section aria-labelledby="potg">
          <h2 id="potg" className="sr-only">
            {he.games.playerOfGame}
          </h2>
          <PlayerOfGameCard player={potg} line={lines.find((l) => l.playerId === potg.id)} note={game.potgNote} />
        </section>
      ) : null}

      {showStats ? (
        <section>
          <SectionHeader title={he.games.boxScore} />
          {lines.length ? (
            <BoxScoreTable lines={lines} players={players} potgId={game.playerOfGameId} events={events} />
          ) : (
            <EmptyState emoji="📋" title={he.empty.boxScore.title} text={he.empty.boxScore.text} />
          )}
        </section>
      ) : null}

      {showStats && lines.length ? (
        <section>
          <SectionHeader title={he.games.teamTotals} />
          <TeamTotals lines={lines} />
        </section>
      ) : null}

      {game.recap ? (
        <section>
          <SectionHeader title={he.games.recap} />
          <div data-user-content className="card space-y-3 p-5 leading-relaxed whitespace-pre-line text-text/90">
            {game.recap}
          </div>
        </section>
      ) : null}

      {roast?.body ? (
        <section>
          <SectionHeader
            title={he.fun.roast.sectionTitle}
            href={`/locker-room/${roast.id}`}
            linkLabel={he.fun.roast.toLockerPost}
            icon={<span aria-hidden>🔥</span>}
          />
          <div className="card p-4">
            <RoastBody body={roast.body} playersById={new Map(roast.mentionedPlayers.map((p) => [p.id, p]))} />
          </div>
        </section>
      ) : null}

      {playOfGame ? (
        <section>
          <SectionHeader title={he.games.playOfGame} icon={<span aria-hidden>🎬</span>} />
          {playOfGame.kind === "video" ? (
            <VideoPlayer media={playOfGame} />
          ) : (
            <ActionGallery media={[playOfGame]} columns={2} />
          )}
          {playOfGame.caption ? (
            <p data-user-content className="mt-2 text-sm text-muted">
              {playOfGame.caption}
            </p>
          ) : null}
        </section>
      ) : null}

      {isFinal ? (
        <section>
          <SectionHeader title={he.games.photos} icon={<span aria-hidden>📸</span>} />
          {photos.length ? <ActionGallery media={photos} /> : <EmptyState emoji="📸" title={he.empty.photos.title} text={he.empty.photos.text} />}
        </section>
      ) : null}

      {videos.length ? (
        <section>
          <SectionHeader title={he.games.videos} icon={<span aria-hidden>🎥</span>} />
          <ActionGallery media={videos} columns={2} />
        </section>
      ) : null}

      {showPlayByPlay && isFinal && events ? (
        <section>
          <SectionHeader title={he.live.playByPlay} />
          <PlayByPlay events={events} players={players} />
        </section>
      ) : null}
    </article>
  );
}
