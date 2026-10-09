import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { MediaImage } from "@/components/common/media-image";
import { SectionHeader } from "@/components/common/section-header";
import { VideoPlayer } from "@/components/media/video-player";
import { Badge } from "@/components/ui/badge";
import { difficultyLabels, exerciseCategoryLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { parseId } from "@/lib/utils/params";

export async function generateMetadata({ params }: PageProps<"/plays/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const exercise = id ? await getData().getExercise(id) : null;
  if (!exercise) return { title: he.empty.notFound.title };
  return { title: exercise.title, description: exercise.description ?? exerciseCategoryLabels[exercise.category] };
}

export default async function ExercisePage({ params }: PageProps<"/plays/[id]">) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const exercise = await getData().getExercise(id);
  if (!exercise) notFound();

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link href="/plays" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text">
        <ChevronRight className="size-4" aria-hidden />
        {he.training.title}
      </Link>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/plays?category=${exercise.category}`}>
            <Badge tone="team">{exerciseCategoryLabels[exercise.category]}</Badge>
          </Link>
          {exercise.difficulty ? (
            <Badge>
              {he.training.difficulty}: {difficultyLabels[exercise.difficulty]}
            </Badge>
          ) : null}
        </div>
        <h1 data-user-content className="font-display text-3xl font-black md:text-4xl">
          {exercise.title}
        </h1>
      </header>

      {exercise.video ? (
        <VideoPlayer media={exercise.video} />
      ) : (
        <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-2">
          <MediaImage media={exercise.image ?? exercise.thumbnail} fallback="/placeholders/exercise.svg" alt="" sizes="(min-width: 768px) 768px, 100vw" priority />
        </div>
      )}

      {exercise.description ? (
        <section className="card p-5">
          <h2 className="mb-1 text-sm font-bold text-team">{he.training.goal}</h2>
          <p data-user-content className="text-lg leading-relaxed">
            {exercise.description}
          </p>
        </section>
      ) : null}

      {exercise.instructions.length ? (
        <section>
          <SectionHeader title={he.training.howTo} />
          <ol className="space-y-2">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="card flex gap-3 p-4">
                <span className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-team font-black text-black">{i + 1}</span>
                <span data-user-content className="pt-1 leading-relaxed">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {exercise.coachingPoints.length ? (
        <section>
          <SectionHeader title={he.training.coachingPoints} />
          <ul className="card divide-y divide-border">
            {exercise.coachingPoints.map((p, i) => (
              <li key={i} className="flex items-center gap-3 p-4">
                <span className="size-2 shrink-0 rounded-full bg-team-2" aria-hidden />
                <span data-user-content>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
