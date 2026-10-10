import { notFound } from "next/navigation";
import { renderAppIcon, renderBadgeIcon } from "@/lib/og/brand";

const variants: Record<string, { size: number; maskable: boolean }> = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
};

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const name = (await params).variant;
  const variant = variants[name];
  if (!variant && name !== "badge") notFound();
  const res = name === "badge" ? renderBadgeIcon(96) : await renderAppIcon(variant!.size, { maskable: variant!.maskable });
  res.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  return res;
}
