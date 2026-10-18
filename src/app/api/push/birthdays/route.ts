import { NextResponse } from "next/server";
import { isInternalPushAuthorized } from "@/lib/push/internal-auth";
import {
  birthdayPushCopy,
  filterBirthdayCandidates,
  jerusalemDateKey,
  type BirthdayCandidate,
} from "@/lib/push/birthdays";
import { sendPush } from "@/lib/push/send";
import { createServiceClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/supabase/env";

/**
 * Internal cron endpoint: send funny birthday pushes for active players whose
 * birth_date matches today in Asia/Jerusalem. Idempotent via birthday_push_sent_on.
 */
export async function POST(request: Request) {
  if (!isInternalPushAuthorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  if (isDemoMode()) return NextResponse.json({ ok: true, sent: 0, reason: "demo" });

  const client = createServiceClient();
  if (!client) return NextResponse.json({ ok: false, reason: "no_service" }, { status: 503 });

  const today = jerusalemDateKey();
  const [{ data: contacts, error: contactsError }, { data: players, error: playersError }] = await Promise.all([
    client.from("player_contacts").select("player_id, birth_date, birthday_push_sent_on").not("birth_date", "is", null),
    client.from("players").select("id, name, nickname").eq("is_active", true),
  ]);

  if (contactsError || playersError) {
    console.error("birthday pushes query failed", contactsError?.message ?? playersError?.message);
    return NextResponse.json({ ok: false, reason: "query" }, { status: 500 });
  }

  const byId = new Map((players ?? []).map((p) => [p.id, p]));
  const candidates: BirthdayCandidate[] = [];
  const sentOn = new Map<number, string | null>();

  for (const row of contacts ?? []) {
    const player = byId.get(row.player_id);
    if (!player || !row.birth_date) continue;
    candidates.push({
      playerId: player.id,
      name: player.name,
      nickname: player.nickname,
      birthDate: row.birth_date,
    });
    sentOn.set(player.id, row.birthday_push_sent_on);
  }

  const due = filterBirthdayCandidates(candidates, today, sentOn);
  let sentPlayers = 0;
  let devices = 0;

  for (const player of due) {
    const copy = birthdayPushCopy(player, today);
    const result = await sendPush("feed", {
      title: copy.title,
      body: copy.body,
      url: copy.url,
      tag: copy.tag,
    });
    devices += result.sent;

    const { error: markError } = await client
      .from("player_contacts")
      .update({ birthday_push_sent_on: today })
      .eq("player_id", player.playerId);
    if (markError) {
      console.error("birthday mark failed", player.playerId, markError.message);
      continue;
    }
    sentPlayers += 1;
  }

  return NextResponse.json({ ok: true, date: today, players: sentPlayers, devices });
}
