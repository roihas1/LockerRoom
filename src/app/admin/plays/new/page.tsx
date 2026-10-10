import { ExerciseForm } from "@/app/admin/plays/exercise-form";
import { BackLink } from "@/components/common/back-link";
import { he } from "@/config/strings";
import { isDemoMode } from "@/lib/supabase/env";

export default function NewExercisePage() {
  return (
    <div className="space-y-4">
      <BackLink href="/admin/plays" label={he.admin.exercises} />
      <h1 className="font-display text-2xl font-bold">{he.admin.newExercise}</h1>
      <ExerciseForm demo={isDemoMode()} />
    </div>
  );
}
