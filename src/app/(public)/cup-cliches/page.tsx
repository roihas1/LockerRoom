import type { Metadata } from "next";
import { CupClicheGenerator } from "@/components/fun/cup-cliche-generator";
import { PageHeader } from "@/components/common/section-header";
import { he } from "@/config/strings";
import { loadInitialCupCliche } from "@/lib/fun/load-cliche";
import { firstParam } from "@/lib/utils/params";

export const metadata: Metadata = {
  title: he.fun.cliche.title,
  description: he.fun.cliche.subtitle,
};

export const dynamic = "force-dynamic";

export default async function CupClichesPage({ searchParams }: PageProps<"/cup-cliches">) {
  const sp = await searchParams;
  const openSuggest = firstParam(sp.suggest) === "1";
  const initial = await loadInitialCupCliche();
  return (
    <div className="space-y-6">
      <PageHeader title={he.fun.cliche.title} subtitle={he.fun.cliche.subtitle} />
      <CupClicheGenerator initial={initial} openSuggest={openSuggest} />
    </div>
  );
}
