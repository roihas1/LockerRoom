import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isInternalPushAuthorized } from "@/lib/push/internal-auth";

const bodySchema = z.object({
  paths: z.array(z.string().startsWith("/")).default(["/", "/games", "/scouting"]),
});

export async function POST(request: Request) {
  if (!isInternalPushAuthorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  for (const path of parsed.data.paths) {
    revalidatePath(path);
    if (path === "/games") revalidatePath("/games/[id]", "page");
  }
  return NextResponse.json({ ok: true, paths: parsed.data.paths });
}
