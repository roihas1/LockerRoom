import { ViewTransition } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/common/back-link";
import { MediaImage } from "@/components/common/media-image";
import { PlayerTag } from "@/components/players/player-tag";
import { Badge } from "@/components/ui/badge";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { parseId } from "@/lib/utils/params";

export async function generateMetadata({ params }: PageProps<"/coaches/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const data = getData();
  const [coach, team] = await Promise.all([id ? data.getCoach(id) : null, data.getTeam()]);
  if (!coach) return { title: he.empty.notFound.title };
  const title = `${coach.name} · ${team.name}`;
  const description = [coach.role, coach.nickname ? `״${coach.nickname}״` : null, coach.hashtag ? `#${coach.hashtag}` : null, coach.description]
    .filter(Boolean)
    .join(" · ");
  return { title: { absolute: title }, description, openGraph: { title, description, type: "profile" } };
}

export default async function CoachPage({ params }: PageProps<"/coaches/[id]">) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const coach = await getData().getCoach(id);
  if (!coach) notFound();

  const funFacts = [
    { label: he.roster.strength, value: coach.strength },
    { label: he.roster.weakness, value: coach.weakness },
    { label: he.roster.quote, value: coach.quote },
  ].filter((f) => f.value);

  return (
    <div className="space-y-8">
      <BackLink href="/players" label={he.roster.title} />

      <header className="card court-bg relative grid overflow-hidden md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="relative aspect-4/5 md:aspect-auto md:min-h-96">
          <ViewTransition name={`coach-photo-${coach.id}`} share="morph" default="none">
            <div className="absolute inset-0">
              <MediaImage media={coach.photo} fallback="/placeholders/player.svg" alt={he.media.playerPhoto(coach.name)} sizes="(min-width: 768px) 40vw, 100vw" priority />
            </div>
          </ViewTransition>
          <div className="absolute inset-0 bg-linear-to-t from-bg via-transparent to-transparent md:bg-linear-to-l" />
        </div>
        <div className="relative -mt-24 space-y-4 p-5 md:mt-0 md:self-center md:p-8">
          <span className="block text-6xl leading-none md:text-8xl" aria-hidden>
            📋
          </span>
          <h1 data-user-content className="font-display text-4xl leading-tight font-black md:text-5xl">
            {coach.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="team">
              <span data-user-content>{coach.role ?? he.roster.coach}</span>
            </Badge>
            {!coach.isActive ? <Badge tone="warning">{he.roster.inactive}</Badge> : null}
          </div>
          {coach.nickname || coach.hashtag ? (
            <p className="flex flex-wrap items-baseline gap-x-3 font-display text-xl font-bold text-team-2">
              {coach.nickname ? (
                <span>
                  ״<span data-user-content>{coach.nickname}</span>״
                </span>
              ) : null}
              <PlayerTag player={coach} className="text-base" />
            </p>
          ) : null}
          {coach.description ? (
            <p data-user-content className="max-w-prose text-text/85">
              {coach.description}
            </p>
          ) : null}
          {coach.intro ? (
            <figure className="max-w-prose rounded-2xl border border-team/40 bg-team/10 p-4">
              <figcaption className="mb-1 text-xs font-bold text-team">
                <span aria-hidden>🎤 </span>
                {he.roster.intro}
              </figcaption>
              <blockquote data-user-content className="font-display text-lg leading-snug font-extrabold">
                {coach.intro}
              </blockquote>
            </figure>
          ) : null}
        </div>
      </header>

      {funFacts.length ? (
        <dl className="grid gap-3 sm:grid-cols-3">
          {funFacts.map((f) => (
            <div key={f.label} className="card p-4">
              <dt className="text-xs font-semibold text-muted">{f.label}</dt>
              <dd data-user-content className="mt-1 font-display text-lg font-bold">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
