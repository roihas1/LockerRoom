import Link from "next/link";
import { Play } from "lucide-react";
import { MediaImage } from "@/components/common/media-image";
import { Badge } from "@/components/ui/badge";
import { difficultyLabels, exerciseCategoryLabels } from "@/config/labels";
import { he } from "@/config/strings";
import type { Exercise } from "@/types/domain";

const difficultyTone = { easy: "win", medium: "warning", hard: "loss" } as const;

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link href={`/plays/${exercise.id}`} className="group card block overflow-hidden transition-colors hover:border-team/50">
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
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="team">{exerciseCategoryLabels[exercise.category]}</Badge>
          {exercise.difficulty ? <Badge tone={difficultyTone[exercise.difficulty]}>{difficultyLabels[exercise.difficulty]}</Badge> : null}
        </div>
        <h2 data-user-content className="font-display text-lg font-extrabold">
          {exercise.title}
        </h2>
        {exercise.description ? (
          <p data-user-content className="line-clamp-2 text-sm text-muted">
            {exercise.description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
