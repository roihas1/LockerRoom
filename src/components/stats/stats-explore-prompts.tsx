"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MediaImage } from "@/components/common/media-image";
import { MilestoneCatalog } from "@/components/stats/milestone-balls";
import { PlayerTag } from "@/components/players/player-tag";
import { he } from "@/config/strings";
import { leaderMeta } from "@/lib/stats/categories";
import {
  explorePromptIds,
  type ExplorePromptId,
  type MilestoneBallLeader,
  type PirNight,
} from "@/lib/stats/explore-prompts";
import type { HotPlayerResult } from "@/lib/stats/trends";
import type { ShameAward, ShameCategory } from "@/lib/stats/shame";
import { shameEmoji } from "@/lib/stats/shame";
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/dates";
import { formatAverage, formatInt, formatPercent } from "@/lib/utils/numbers";
import type { Media, Player } from "@/types/domain";

type SlimPlayer = Pick<Player, "id" | "name" | "jerseyNumber" | "nickname" | "hashtag" | "photo">;

export type ExplorePromptSnapshot = {
  hot: HotPlayerResult | null;
  glass: { playerId: number; value: number }[];
  pirNights: PirNight[];
  shame: ShameAward[];
  ballLeaders: MilestoneBallLeader[];
  playersById: Record<string, SlimPlayer>;
  leadersHref: string;
  gamesHref: string;
  playersHref: string;
};

const promptMeta = he.statsPage.explore.prompts;

const shameFormat: Record<ShameCategory, (v: number) => string> = {
  bricks: formatPercent,
  santa: formatAverage,
  trigger: (v) => formatInt(v),
  fouls: formatAverage,
  freeThrows: formatPercent,
  blackHole: formatAverage,
  airball: formatPercent,
  ghost: formatAverage,
  fouledOut: (v) => formatInt(v),
};

function playerOf(map: Record<string, SlimPlayer>, id: number): SlimPlayer | undefined {
  return map[String(id)];
}

const promptEmoji: Record<ExplorePromptId, string> = {
  hot: "🔥",
  glass: "🧱",
  pirNights: "📈",
  shame: "🏆",
  milestones: "🎯",
};

/** Interactive “ask a question” overview prototype for /stats. */
export function StatsExplorePrompts({ data }: { data: ExplorePromptSnapshot }) {
  const [active, setActive] = useState<ExplorePromptId | null>(null);
  const copy = he.statsPage.explore;

  const availability = useMemo(
    () =>
      ({
        hot: !!data.hot,
        glass: data.glass.length > 0,
        pirNights: data.pirNights.length > 0,
        shame: data.shame.length > 0,
        milestones: data.ballLeaders.length > 0,
      }) satisfies Record<ExplorePromptId, boolean>,
    [data],
  );

  return (
    <section className="space-y-4" aria-labelledby="stats-explore-title">
      {active === null ? (
        <>
          <header className="space-y-1">
            <p className="text-xs font-semibold tracking-wide text-team">{copy.subtitle}</p>
            <h2 id="stats-explore-title" className="font-display text-2xl font-extrabold md:text-3xl">
              {copy.title}
            </h2>
          </header>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {explorePromptIds.map((id) => {
              const meta = promptMeta[id];
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setActive(id)}
                    className={cn(
                      "group flex h-full w-full flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-start transition",
                      "hover:border-team/50 hover:bg-team/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-team",
                      "motion-safe:hover:-translate-y-0.5",
                      !availability[id] && "opacity-80",
                    )}
                  >
                    <span className="text-2xl" aria-hidden>
                      {promptEmoji[id]}
                    </span>
                    <span className="font-display text-lg font-extrabold group-hover:text-team">{meta.question}</span>
                    <span className="text-sm text-muted">{meta.hint}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="space-y-4 motion-safe:animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-muted">{promptMeta[active].question}</p>
              <h2 id="stats-explore-title" className="font-display text-xl font-extrabold md:text-2xl">
                {promptMeta[active].answerTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-team hover:bg-team/10"
            >
              {copy.back}
            </button>
          </div>
          <PromptAnswer id={active} data={data} />
        </div>
      )}
    </section>
  );
}

function PromptAnswer({ id, data }: { id: ExplorePromptId; data: ExplorePromptSnapshot }) {
  switch (id) {
    case "hot":
      return data.hot ? (
        <HotAnswer hot={data.hot} player={playerOf(data.playersById, data.hot.playerId)} />
      ) : (
        <Empty text={he.statsPage.hotPlayer.empty} />
      );
    case "glass":
      return data.glass.length ? (
        <LeaderList
          rows={data.glass}
          playersById={data.playersById}
          format={leaderMeta.rebounds.format}
          unit={he.stats.perGame}
          moreHref={data.leadersHref}
          moreLabel={he.statsPage.explore.openLeaders}
        />
      ) : (
        <Empty />
      );
    case "pirNights":
      return data.pirNights.length ? (
        <PirNightsList nights={data.pirNights} playersById={data.playersById} moreHref={data.gamesHref} />
      ) : (
        <Empty />
      );
    case "shame":
      return data.shame.length ? <ShameList awards={data.shame} playersById={data.playersById} /> : <Empty />;
    case "milestones":
      return data.ballLeaders.length ? (
        <BallsAnswer leaders={data.ballLeaders} playersById={data.playersById} moreHref={data.playersHref} />
      ) : (
        <Empty text={he.statsPage.milestoneBalls.empty} />
      );
  }
}

function BallsAnswer({
  leaders,
  playersById,
  moreHref,
}: {
  leaders: MilestoneBallLeader[];
  playersById: Record<string, SlimPlayer>;
  moreHref: string;
}) {
  const copy = he.statsPage.milestoneBalls;
  return (
    <div className="space-y-3">
      <ol className="card divide-y divide-border overflow-hidden">
        {leaders.map((row, i) => {
          const player = playerOf(playersById, row.playerId);
          if (!player) return null;
          return (
            <li key={row.playerId}>
              <Link href={`/players/${player.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
                <span className="num w-5 text-xs text-muted">{i + 1}</span>
                <span data-user-content className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {player.name}
                </span>
                <span className="num shrink-0 text-sm font-black text-team">
                  🏀 {copy.ballsShort(row.balls)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <MilestoneCatalog />
      <MoreLink href={moreHref} label={he.statsPage.explore.openPlayers} />
    </div>
  );
}

function Empty({ text = he.statsPage.explore.empty }: { text?: string }) {
  return <p className="card p-5 text-sm text-muted">{text}</p>;
}

function HotAnswer({ hot, player }: { hot: HotPlayerResult; player: SlimPlayer | undefined }) {
  if (!player) return <Empty />;
  return (
    <div className="card overflow-hidden border-team/40 bg-linear-to-l from-team/15 via-transparent to-transparent">
      <Link href={`/players/${player.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-2/60">
        <Avatar photo={player.photo} name={player.name} ring="ring-team/70" />
        <div className="min-w-0 flex-1">
          <p data-user-content className="truncate font-display text-xl font-extrabold">
            {player.name}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {player.jerseyNumber !== null ? <span className="num">#{player.jerseyNumber}</span> : null}
            <PlayerTag player={player} className="truncate" />
            <span>{he.statsPage.hotPlayer.windowHint(hot.gamesPlayed, hot.windowGames)}</span>
          </p>
        </div>
        <p className="text-end">
          <bdi dir="ltr" className="num block text-3xl leading-none font-black text-team">
            {formatAverage(hot.avgPir)}
          </bdi>
          <span className="text-[11px] text-muted">{he.stats.pir}</span>
        </p>
      </Link>
      <dl className="grid grid-cols-3 gap-px border-t border-border bg-border/40 text-center text-sm">
        <MiniStat label={he.stats.pointsLong} value={formatAverage(hot.avgPoints)} />
        <MiniStat label={he.stats.reboundsLong} value={formatAverage(hot.avgRebounds)} />
        <MiniStat label={he.stats.assistsLong} value={formatAverage(hot.avgAssists)} />
      </dl>
    </div>
  );
}

function LeaderList({
  rows,
  playersById,
  format,
  unit,
  moreHref,
  moreLabel,
}: {
  rows: { playerId: number; value: number }[];
  playersById: Record<string, SlimPlayer>;
  format: (v: number) => string;
  unit: string;
  moreHref: string;
  moreLabel: string;
}) {
  const max = rows[0]?.value ?? 1;
  return (
    <div className="space-y-3">
      <ol className="card divide-y divide-border overflow-hidden">
        {rows.map((row, i) => {
          const player = playerOf(playersById, row.playerId);
          if (!player) return null;
          const width = Math.max(8, Math.round((row.value / max) * 100));
          return (
            <li key={row.playerId}>
              <Link href={`/players/${player.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <span className="num w-5 text-sm text-muted">{i + 1}</span>
                <Avatar photo={player.photo} name={player.name} size="sm" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p data-user-content className="truncate font-semibold">
                    {player.name}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                    <div className="h-full rounded-full bg-team" style={{ width: `${width}%` }} />
                  </div>
                </div>
                <p className="text-end">
                  <bdi dir="ltr" className="num block text-xl font-black text-team">
                    {format(row.value)}
                  </bdi>
                  <span className="text-[11px] text-muted">{unit}</span>
                </p>
              </Link>
            </li>
          );
        })}
      </ol>
      <MoreLink href={moreHref} label={moreLabel} />
    </div>
  );
}

function PirNightsList({
  nights,
  playersById,
  moreHref,
}: {
  nights: PirNight[];
  playersById: Record<string, SlimPlayer>;
  moreHref: string;
}) {
  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {nights.map((n, i) => {
          const player = playerOf(playersById, n.playerId);
          if (!player) return null;
          return (
            <li key={`${n.gameId}-${n.playerId}`}>
              <Link
                href={`/games/${n.gameId}`}
                className="card flex items-center gap-3 p-3 transition hover:border-team/40 hover:bg-team/5"
              >
                <span className="num flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-muted">
                  {i + 1}
                </span>
                <Avatar photo={player.photo} name={player.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p data-user-content className="truncate font-display font-bold">
                    {player.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {he.result.vs} <span data-user-content>{n.opponent}</span>
                    {" · "}
                    <span className="num">{formatShortDate(n.tipoffAt)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    <bdi dir="ltr" className="num">
                      {formatInt(n.points)}/{formatInt(n.rebounds)}/{formatInt(n.assists)}
                    </bdi>
                  </p>
                </div>
                <p className="text-end">
                  <bdi dir="ltr" className="num block text-2xl font-black text-team">
                    {formatInt(n.pir)}
                  </bdi>
                  <span className="text-[11px] text-muted">{he.stats.pir}</span>
                </p>
              </Link>
            </li>
          );
        })}
      </ol>
      <MoreLink href={moreHref} label={he.statsPage.explore.openGames} />
    </div>
  );
}

function ShameList({ awards, playersById }: { awards: ShameAward[]; playersById: Record<string, SlimPlayer> }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {awards.map((a, i) => {
        const player = playerOf(playersById, a.playerId);
        const copy = he.fun.shame[a.category];
        if (!player) return null;
        return (
          <li key={a.category}>
            <Link
              href={`/players/${player.id}`}
              className={cn(
                "card flex items-center gap-3 border-dashed p-4 transition hover:border-warning/60 motion-safe:hover:scale-[1.02]",
                i % 2 === 0 ? "motion-safe:-rotate-1" : "motion-safe:rotate-1",
              )}
            >
              <span className="text-3xl" aria-hidden>
                {shameEmoji[a.category]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-extrabold text-warning">{copy.label}</p>
                <p data-user-content className="truncate font-semibold">
                  {player.name}
                </p>
                <p className="text-[11px] text-muted">{copy.hint}</p>
              </div>
              <bdi dir="ltr" className="num text-xl font-black">
                {shameFormat[a.category](a.value)}
              </bdi>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-2 py-3">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="num font-bold">{value}</dd>
    </div>
  );
}

function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex justify-center">
      <Link href={href} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-team hover:bg-team/10">
        {label}
      </Link>
    </div>
  );
}

function Avatar({
  photo,
  name,
  size = "md",
  ring = "ring-border",
}: {
  photo: Media | null | undefined;
  name: string;
  size?: "sm" | "md";
  ring?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-surface-3 ring-2",
        size === "sm" ? "size-10" : "size-14",
        ring,
      )}
    >
      <MediaImage media={photo} fallback="/placeholders/player.svg" alt={he.media.playerPhoto(name)} sizes="56px" />
    </div>
  );
}
