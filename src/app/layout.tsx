import type { Metadata, Viewport } from "next";
import { Heebo, Rubik } from "next/font/google";
import { Direction } from "radix-ui";
import type { CSSProperties, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { getSiteUrl, isIndexingAllowed } from "@/config/site";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import "./globals.css";

const rubik = Rubik({ subsets: ["hebrew", "latin"], weight: ["500", "700", "800", "900"], variable: "--font-rubik", display: "swap" });
const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-heebo", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const team = await getData().getTeam();
  const indexing = isIndexingAllowed();
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: team.name, template: `%s · ${team.name}` },
    description: team.description ?? he.meta.defaultDescription,
    applicationName: team.name,
    robots: indexing ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
    openGraph: { type: "website", locale: "he_IL", siteName: team.name },
    icons: { icon: "/placeholders/logo.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const team = await getData().getTeam();
  const style = { "--team-primary": team.primaryColor, "--team-secondary": team.secondaryColor } as CSSProperties;
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${heebo.variable}`} style={style}>
      <body className="antialiased">
        <Direction.Provider dir="rtl">
          {children}
          <Toaster />
        </Direction.Provider>
      </body>
    </html>
  );
}
