import Link from "next/link";
import { ViewTransition, type ReactNode } from "react";
import { InstallBanner } from "@/components/app/install-prompt";
import { NotificationsBanner } from "@/components/app/notifications-banner";
import { EasterEggs } from "@/components/fun/easter-eggs";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";

/** Public shell: ISR-style revalidation; data also tagged `public` for on-demand bust. */
export const revalidate = 60;

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const team = await getData().getTeam();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-team focus:px-4 focus:py-2 focus:font-bold focus:text-black"
      >
        {he.skipToContent}
      </a>
      <SiteHeader team={team} />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-5 pb-6 md:pt-8 md:pb-16">
        <NotificationsBanner />
        <ViewTransition>{children}</ViewTransition>
      </main>
      <footer className="mx-auto hidden max-w-6xl items-center justify-between px-4 pb-10 text-xs text-muted md:flex">
        <span data-user-content>{team.name}</span>
        <div className="flex items-center gap-4">
          <Link href="/join" className="hover:text-text">
            {he.app.join.footerLink}
          </Link>
          <Link href="/login" className="hover:text-text">
            {he.nav.adminLogin}
          </Link>
        </div>
      </footer>
      <div className="flex justify-center gap-2 pb-24 text-center text-xs text-muted md:hidden">
        <Link href="/join" className="inline-block p-2 hover:text-text">
          {he.app.join.footerLink}
        </Link>
        <Link href="/login" className="inline-block p-2 hover:text-text">
          {he.nav.adminLogin}
        </Link>
      </div>
      <InstallBanner />
      <BottomNav />
      <EasterEggs />
    </>
  );
}
