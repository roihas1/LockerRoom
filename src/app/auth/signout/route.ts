import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/env";

export async function POST(request: Request) {
  if (!isDemoMode()) {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
