import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchIbbaJson, isAllowedIbbaUrl } from "@/lib/league/ibba-fetch";
import { isInternalPushAuthorized } from "@/lib/push/internal-auth";

/** Allow long IBBA event list fetches when the platform supports it (e.g. Vercel). */
export const maxDuration = 300;

const bodySchema = z.object({
  url: z.string().url(),
  timeoutMs: z.number().int().min(5_000).max(120_000).optional(),
});

/** Internal proxy: Supabase Edge → Amplify → ibasketball (Edge IPs are often blocked with 403). */
export async function POST(request: Request) {
  if (!isInternalPushAuthorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isAllowedIbbaUrl(parsed.data.url)) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  try {
    const data = await fetchIbbaJson(parsed.data.url, { timeoutMs: parsed.data.timeoutMs ?? 120_000 });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
