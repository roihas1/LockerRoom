import { MediaImage } from "@/components/common/media-image";
import { TeamLogo } from "@/components/common/team-logo";
import { he } from "@/config/strings";
import type { Season, Team } from "@/types/domain";

export function Hero({
  team,
  season,
  record,
  streak,
}: {
  team: Team;
  season: Season | null;
  record: { wins: number; losses: number };
  streak: { type: "win" | "loss"; count: number } | null;
}) {
  const played = record.wins + record.losses > 0;
  return (
    <section className="relative isolate -mx-4 overflow-hidden md:mx-0 md:rounded-3xl md:border md:border-border">
      <div className="absolute inset-0 -z-10">
        <MediaImage media={team.cover} fallback="/placeholders/cover.svg" alt={he.media.teamCover} sizes="(min-width: 1152px) 1152px, 100vw" priority />
        <div className="absolute inset-0 bg-linear-to-t from-bg via-bg/75 to-bg/20" />
      </div>
      <div className="flex min-h-[22rem] flex-col justify-end gap-4 px-5 pt-16 pb-6 md:min-h-[26rem] md:px-10 md:pb-10">
        <div className="flex items-center gap-4">
          <TeamLogo team={team} className="size-16 border-2 border-team-2/60 md:size-20" priority />
          <div>
            <h1 data-user-content className="font-display text-3xl leading-tight font-black md:text-5xl">
              {team.name}
            </h1>
            {season ? <p className="mt-1 font-semibold text-team">{he.home.season(season.name)}</p> : null}
          </div>
        </div>
        {played ? (
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <span className="block text-xs text-muted">{he.stats.record}</span>
              <bdi dir="ltr" className="num text-6xl leading-none font-black md:text-7xl">
                {record.wins}
                <span className="mx-1 text-muted">-</span>
                {record.losses}
              </bdi>
            </div>
            {streak && streak.count > 1 ? (
              <p className={streak.type === "win" ? "rounded-full bg-win/15 px-3 py-1 text-sm font-bold text-win" : "rounded-full bg-loss/15 px-3 py-1 text-sm font-bold text-loss"}>
                <span aria-hidden>{streak.type === "win" ? "🔥 " : "🧊 "}</span>
                {streak.type === "win" ? he.streak.win(streak.count) : he.streak.loss(streak.count)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
