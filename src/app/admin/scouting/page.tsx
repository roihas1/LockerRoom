import Link from "next/link";
import { ScoutingForm } from "@/components/admin/scouting-form";
import { he } from "@/config/strings";
import { listSeasonOpponents } from "@/lib/league/scouting";
import { createSessionClient } from "@/lib/supabase/server";
import { firstParam } from "@/lib/utils/params";
import { cn } from "@/lib/utils/cn";

export default async function AdminScoutingPage({ searchParams }: PageProps<"/admin/scouting">) {
  const sp = await searchParams;
  const opponents = await listSeasonOpponents();
  const selected = firstParam(sp.opponent) ?? opponents[0] ?? null;

  let existing = null;
  if (selected) {
    const client = await createSessionClient();
    const { data } = await client
      .from("opponent_scouting")
      .select("opponent_name, notes, key_players")
      .eq("opponent_name", selected)
      .maybeSingle();
    if (data) {
      existing = {
        opponentName: data.opponent_name,
        notes: data.notes,
        keyPlayers: (data.key_players as { name: string; number?: string; position?: string; note?: string }[]) ?? [],
      };
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">{he.admin.scoutingForm.title}</h1>
      </header>
      {opponents.length ? (
        <nav className="flex flex-wrap gap-2">
          {opponents.map((name) => (
            <Link
              key={name}
              href={`/admin/scouting?opponent=${encodeURIComponent(name)}`}
              data-user-content
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-semibold",
                name === selected ? "border-team bg-team/15 text-team" : "border-border text-muted",
              )}
            >
              {name}
            </Link>
          ))}
        </nav>
      ) : (
        <p className="text-muted">{he.admin.noItems}</p>
      )}
      {selected ? <ScoutingForm opponent={selected} existing={existing} /> : null}
    </div>
  );
}
