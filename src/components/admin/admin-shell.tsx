import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { DemoBanner } from "@/components/admin/demo-banner";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import { isDemoMode } from "@/lib/supabase/env";

export function AdminShell({ children, email }: { children: ReactNode; email: string | null }) {
  const demo = isDemoMode();
  return (
    <div className="min-h-dvh bg-bg">
      {demo ? <DemoBanner /> : null}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="font-display text-lg font-bold">{he.admin.title}</p>
            {email ? <p className="text-xs text-muted">{email}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">{he.admin.viewSite}</Link>
            </Button>
            {!demo ? (
              <form action="/auth/signout" method="post">
                <Button variant="outline" size="sm" type="submit">
                  {he.actions.logout}
                </Button>
              </form>
            ) : null}
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
          <AdminNav orientation="horizontal" />
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[12rem_1fr]">
        <aside className="hidden md:block">
          <AdminNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
