import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exerciseCategoryLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { getAdminData } from "@/lib/data";

export default async function AdminTrainingPage() {
  const exercises = await getAdminData().then((d) => d.getExercises());

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{he.admin.exercises}</h1>
        <Button asChild>
          <Link href="/admin/plays/new">{he.admin.newExercise}</Link>
        </Button>
      </header>

      {exercises.length === 0 ? (
        <p className="text-muted">{he.admin.noItems}</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <Link href={`/admin/plays/${ex.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2">
                <span className="font-medium" data-user-content>
                  {ex.title}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">{exerciseCategoryLabels[ex.category]}</span>
                  <Badge tone={ex.isPublished ? "win" : "neutral"}>{ex.isPublished ? he.admin.published : he.admin.draft}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
