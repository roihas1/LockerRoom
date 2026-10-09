"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { he } from "@/config/strings";

/** Supabase stores the session in a readable `sb-<project>-auth-token` cookie (chunked as `.0`, `.1` when large). */
function hasSessionCookie(): boolean {
  return /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/.test(document.cookie);
}

const subscribe = () => () => {};

/** Shortcut back to the admin for signed-in managers. The admin layout still enforces the real role check. */
export function AdminLink() {
  const signedIn = useSyncExternalStore(subscribe, hasSessionCookie, () => false);
  if (!signedIn) return null;
  return (
    <Link
      href="/admin"
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-team/40 bg-team/10 px-3 py-1.5 text-sm font-semibold text-team transition-colors hover:bg-team/20"
    >
      <ShieldCheck className="size-4" aria-hidden />
      {he.nav.admin}
    </Link>
  );
}
