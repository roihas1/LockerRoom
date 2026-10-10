import { PlayerForm } from "@/app/admin/players/player-form";
import { BackLink } from "@/components/common/back-link";
import { he } from "@/config/strings";
import { isDemoMode } from "@/lib/supabase/env";

export default function NewPlayerPage() {
  return (
    <div className="space-y-4">
      <BackLink href="/admin/players" label={he.admin.players} />
      <h1 className="font-display text-2xl font-bold">{he.admin.newPlayer}</h1>
      <PlayerForm demo={isDemoMode()} />
    </div>
  );
}
