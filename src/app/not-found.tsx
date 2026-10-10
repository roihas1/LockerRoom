import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { HoopGame } from "@/components/fun/hoop-game";
import { buttonVariants } from "@/components/ui/button";
import { he } from "@/config/strings";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <EmptyState
        emoji="🏀💨"
        title={he.empty.notFound.title}
        text={he.empty.notFound.text}
        className="w-full"
        action={
          <Link href="/" className={buttonVariants()}>
            {he.actions.toHome}
          </Link>
        }
      />
      <HoopGame />
    </main>
  );
}
