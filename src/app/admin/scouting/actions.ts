"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { he } from "@/config/strings";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";

const keyPlayerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  number: z.string().trim().max(8).optional(),
  position: z.string().trim().max(40).optional(),
  note: z.string().trim().max(200).optional(),
});

const schema = z.object({
  opponentName: z.string().trim().min(1).max(80),
  notes: z
    .string()
    .max(2000)
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .nullable(),
  keyPlayers: z.array(keyPlayerSchema).max(12),
});

function parseKeyPlayers(formData: FormData): z.infer<typeof keyPlayerSchema>[] {
  const names = formData.getAll("kpName").map(String);
  const numbers = formData.getAll("kpNumber").map(String);
  const positions = formData.getAll("kpPosition").map(String);
  const notes = formData.getAll("kpNote").map(String);
  const rows: z.infer<typeof keyPlayerSchema>[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i]?.trim() ?? "";
    if (!name) continue;
    rows.push({
      name,
      number: numbers[i]?.trim() || undefined,
      position: positions[i]?.trim() || undefined,
      note: notes[i]?.trim() || undefined,
    });
  }
  return rows;
}

export async function saveOpponentScoutingAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demo = blockDemoMutation();
  if (demo) return demo;

  const parsed = schema.safeParse({
    opponentName: formData.get("opponentName"),
    notes: formData.get("notes"),
    keyPlayers: parseKeyPlayers(formData),
  });
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const { error } = await supabase.from("opponent_scouting").upsert({
    opponent_name: parsed.data.opponentName,
    notes: parsed.data.notes,
    key_players: parsed.data.keyPlayers,
    updated_at: new Date().toISOString(),
  });
  if (error) return mapErrorToAction(error);

  revalidatePath("/scouting");
  revalidatePath("/admin/scouting");
  return actionSuccess(he.admin.scoutingForm.saved);
}
