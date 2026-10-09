"use client";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <EmptyState emoji="😵" title={he.empty.error.title} text={he.empty.error.text} className="w-full" action={<Button onClick={reset}>{he.actions.reload}</Button>} />
    </main>
  );
}
