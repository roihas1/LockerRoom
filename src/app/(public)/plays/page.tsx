import type { Metadata } from "next";
import { EmptyState } from "@/components/common/empty-state";
import { FilterChips } from "@/components/common/filter-chips";
import { PageHeader } from "@/components/common/section-header";
import { ExerciseCard } from "@/components/training/exercise-card";
import { exerciseCategoryLabels, exerciseCategoryOrder } from "@/config/labels";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { firstParam } from "@/lib/utils/params";
import type { ExerciseCategory } from "@/types/domain";

export const metadata: Metadata = { title: he.training.title, description: he.training.subtitle };

export default async function TrainingPage({ searchParams }: PageProps<"/plays">) {
  const raw = firstParam((await searchParams).category);
  const category = exerciseCategoryOrder.includes(raw as ExerciseCategory) ? (raw as ExerciseCategory) : undefined;
  const exercises = await getData().getExercises(category);

  return (
    <>
      <PageHeader title={he.training.title} subtitle={he.training.subtitle} />
      <FilterChips
        label={he.admin.exerciseForm.category}
        items={[
          { href: "/plays", label: he.training.all, active: !category },
          ...exerciseCategoryOrder.map((c) => ({ href: `/plays?category=${c}`, label: exerciseCategoryLabels[c], active: c === category })),
        ]}
      />
      {exercises.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((e) => (
            <li key={e.id}>
              <ExerciseCard exercise={e} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState emoji="📋" title={he.empty.exercises.title} text={he.empty.exercises.text} />
      )}
    </>
  );
}
