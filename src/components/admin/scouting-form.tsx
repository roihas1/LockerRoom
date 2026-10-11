"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { saveOpponentScoutingAction } from "@/app/admin/scouting/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import type { OpponentScoutingNotes } from "@/lib/league/scouting";

type KeyPlayerRow = { name: string; number: string; position: string; note: string };

const emptyRow = (): KeyPlayerRow => ({ name: "", number: "", position: "", note: "" });

export function ScoutingForm({ opponent, existing }: { opponent: string; existing: OpponentScoutingNotes | null }) {
  const [state, action, pending] = useActionState(saveOpponentScoutingAction, null);
  const [rows, setRows] = useState<KeyPlayerRow[]>(() =>
    existing?.keyPlayers?.length
      ? existing.keyPlayers.map((p) => ({
          name: p.name,
          number: p.number ?? "",
          position: p.position ?? "",
          note: p.note ?? "",
        }))
      : [emptyRow()],
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="card space-y-4 p-5">
      <input type="hidden" name="opponentName" value={opponent} />
      <h2 className="font-display text-lg font-bold" data-user-content>
        {opponent}
      </h2>
      <label className="block space-y-1 text-sm">
        <span className="font-semibold">{he.admin.scoutingForm.notes}</span>
        <Textarea name="notes" rows={4} defaultValue={existing?.notes ?? ""} />
      </label>
      <fieldset className="space-y-3">
        <legend className="font-semibold">{he.admin.scoutingForm.keyPlayers}</legend>
        {rows.map((p, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-2">
            <Input name="kpName" placeholder={he.admin.scoutingForm.playerName} defaultValue={p.name} />
            <Input name="kpNumber" placeholder={he.admin.scoutingForm.playerNumber} defaultValue={p.number} className="num" />
            <Input name="kpPosition" placeholder={he.admin.scoutingForm.playerPosition} defaultValue={p.position} />
            <Input name="kpNote" placeholder={he.admin.scoutingForm.playerNote} defaultValue={p.note} />
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={() => setRows((r) => [...r, emptyRow()])}>
          {he.admin.scoutingForm.addPlayer}
        </Button>
      </fieldset>
      <Button type="submit" disabled={pending}>
        {he.actions.save}
      </Button>
    </form>
  );
}
