import Link from "next/link";
import { ExerciseForm } from "@/app/admin/plays/exercise-form";
import { he } from "@/config/strings";
import { isDemoMode } from "@/lib/supabase/env";

export default function NewExercisePage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/plays" className="text-sm text-muted hover:text-text">
        {he.actions.back}
      </Link>
      <h1 className="font-display text-2xl font-bold">{he.admin.newExercise}</h1>
      <ExerciseForm demo={isDemoMode()} />
    </div>
  );
}
