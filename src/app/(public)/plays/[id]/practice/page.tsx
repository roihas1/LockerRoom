import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/common/back-link";
import { PracticeSession } from "@/components/practice/practice-session";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { parseId } from "@/lib/utils/params";

export async function generateMetadata({ params }: PageProps<"/plays/[id]/practice">): Promise<Metadata> {
  const id = parseId((await params).id);
  const exercise = id ? await getData().getExercise(id) : null;
  if (!exercise) return { title: he.empty.notFound.title };
  return { title: `${he.training.practice.title} · ${exercise.title}` };
}

export default async function PracticePage({ params }: PageProps<"/plays/[id]/practice">) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const exercise = await getData().getExercise(id);
  if (!exercise) notFound();
  if (!exercise.diagram) notFound();

  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <BackLink href={`/plays/${exercise.id}`} label={exercise.title} />
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-black md:text-3xl">{he.training.practice.title}</h1>
        <p className="text-muted">{he.training.practice.subtitle}</p>
      </header>
      <PracticeSession diagram={exercise.diagram} title={exercise.title} />
    </article>
  );
}
