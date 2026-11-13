import { NextResponse } from "next/server";
import seed from "@/fixtures/cup-cliches.json";
import { pickWeightedCliche, type CupCliche } from "@/lib/fun/cliches";
import { notifyClichePending } from "@/lib/push/notify";
import { isDemoMode } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

export type ListClichesResult =
  | { ok: true; items: CupCliche[] }
  | { ok: false; reason: "demo" | "failed" };

export type PickClicheResult =
  | { ok: true; item: CupCliche }
  | { ok: false; reason: "empty" | "failed" };

export type SubmitClicheResult =
  | { ok: true; id: number }
  | { ok: false; reason: "demo" | "invalid" | "rate_limited" | "duplicate" | "failed" };

function mapApprovedRow(row: { id: number; body: string; said_by: string; weight: number; verified: boolean }): CupCliche {
  return {
    id: row.id,
    body: row.body,
    saidBy: row.said_by,
    weight: row.weight,
    verified: row.verified,
  };
}

function demoApproved(): CupCliche[] {
  return seed.map((row, index) => ({
    id: index + 1,
    body: row.text,
    saidBy: row.saidBy,
    weight: row.weight,
    verified: row.verified,
  }));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pick = url.searchParams.get("pick") === "1";

  if (isDemoMode()) {
    const items = demoApproved();
    if (pick) {
      const item = pickWeightedCliche(items);
      if (!item) return NextResponse.json({ ok: false, reason: "empty" } satisfies PickClicheResult, { status: 404 });
      return NextResponse.json({ ok: true, item } satisfies PickClicheResult);
    }
    return NextResponse.json({ ok: true, items } satisfies ListClichesResult);
  }

  const { data, error } = await createPublicClient().rpc("list_approved_cup_cliches");
  if (error || !data) {
    return NextResponse.json({ ok: false, reason: "failed" } satisfies ListClichesResult, { status: 500 });
  }
  const items = data.map(mapApprovedRow);
  if (pick) {
    const item = pickWeightedCliche(items);
    if (!item) return NextResponse.json({ ok: false, reason: "empty" } satisfies PickClicheResult, { status: 404 });
    return NextResponse.json({ ok: true, item } satisfies PickClicheResult);
  }
  return NextResponse.json({ ok: true, items } satisfies ListClichesResult);
}

export async function POST(request: Request) {
  const reply = (body: SubmitClicheResult, status = 200) => NextResponse.json(body, { status });
  if (isDemoMode()) return reply({ ok: false, reason: "demo" });

  const { submitClicheSchema } = await import("@/lib/validation/cliche");
  const parsed = submitClicheSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ ok: false, reason: "invalid" }, 400);

  const { data, error } = await createPublicClient().rpc("submit_cup_cliche", {
    p_body: parsed.data.body,
    p_said_by: parsed.data.saidBy,
    p_weight: parsed.data.weight,
    p_device_id: parsed.data.deviceId,
  });

  if (error) {
    if (error.code === "54000") return reply({ ok: false, reason: "rate_limited" }, 429);
    if (error.code === "23505") return reply({ ok: false, reason: "duplicate" }, 409);
    return reply({ ok: false, reason: "failed" }, 400);
  }

  const id = typeof data === "number" ? data : Number(data);
  if (!Number.isFinite(id)) return reply({ ok: false, reason: "failed" }, 500);

  try {
    notifyClichePending(id, parsed.data.body);
  } catch (err) {
    console.error("notifyClichePending failed", err);
  }
  return reply({ ok: true, id });
}
