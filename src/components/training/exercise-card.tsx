import Link from "next/link";
import { Play } from "lucide-react";
import { MediaImage } from "@/components/common/media-image";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { difficultyLabels, exerciseCategoryLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import type { Exercise } from "@/types/domain";

const difficultyTone = { easy: "win", medium: "warning", hard: "loss" } as const;

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <article className="card overflow-hidden transition-colors hover:border-team/50">
      <Link href={`/plays/${exercise.id}`} className="group block">
        <div className="relative aspect-video bg-surface-2">
          <MediaImage
            media={exercise.thumbnail ?? exercise.image}
            fallback="/placeholders/exercise.svg"
            alt=""
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
          {exercise.video ? (
            <span className="absolute end-3 bottom-3 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold">
              <Play className="size-3 fill-current" aria-hidden />
              {he.training.video}
            </span>
          ) : null}
        </div>
        <div className="space-y-2 p-4 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="team">{exerciseCategoryLabels[exercise.category]}</Badge>
            {exercise.difficulty ? <Badge tone={difficultyTone[exercise.difficulty]}>{difficultyLabels[exercise.difficulty]}</Badge> : null}
          </div>
          <h2 data-user-content className="font-display text-lg font-extrabold group-hover:text-team">
            {exercise.title}
          </h2>
          {exercise.description ? (
            <p data-user-content className="line-clamp-2 text-sm text-muted">
              {exercise.description}
            </p>
          ) : null}
        </div>
      </Link>
      {exercise.diagram ? (
        <div className="px-4 pb-4">
          <Link href={`/plays/${exercise.id}/practice`} className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "w-full")}>
            {he.training.practice.button}
          </Link>
        </div>
      ) : null}
    </article>
  );
}
