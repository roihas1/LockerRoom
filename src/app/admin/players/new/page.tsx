import Link from "next/link";
import { PlayerForm } from "@/app/admin/players/player-form";
import { he } from "@/config/strings";
import { isDemoMode } from "@/lib/supabase/env";

export default function NewPlayerPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/players" className="text-sm text-muted hover:text-text">
        {he.actions.back}
      </Link>
      <h1 className="font-display text-2xl font-bold">{he.admin.newPlayer}</h1>
      <PlayerForm demo={isDemoMode()} />
    </div>
  );
}
