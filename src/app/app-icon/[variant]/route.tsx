import { notFound } from "next/navigation";
import { renderAppIcon } from "@/lib/og/brand";

const variants: Record<string, { size: number; maskable: boolean }> = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
  badge: { size: 96, maskable: true },
};

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const variant = variants[(await params).variant];
  if (!variant) notFound();
  const res = await renderAppIcon(variant.size, { maskable: variant.maskable });
  res.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  return res;
}
