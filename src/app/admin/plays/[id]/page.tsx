import { notFound } from "next/navigation";
import { ExerciseForm } from "@/app/admin/plays/exercise-form";
import { BackLink } from "@/components/common/back-link";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/env";
import { parseId } from "@/lib/utils/params";

export default async function EditExercisePage({ params }: PageProps<"/admin/plays/[id]">) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) notFound();

  const exercise = await getAdminData().then((d) => d.getExercise(id));
  if (!exercise) notFound();

  return (
    <div className="space-y-4">
      <BackLink href="/admin/plays" label={he.admin.exercises} />
      <h1 className="font-display text-2xl font-bold" data-user-content>
        {exercise.title}
      </h1>
      <ExerciseForm exercise={exercise} demo={isDemoMode()} />
    </div>
  );
}
