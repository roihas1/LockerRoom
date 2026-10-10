import type { MetadataRoute } from "next";
import { he } from "@/config/strings";
import { APP_BACKGROUND, loadBrand } from "@/lib/og/brand";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await loadBrand();
  return {
    id: "/",
    name: brand.name,
    short_name: brand.shortName,
    description: he.meta.defaultDescription,
    lang: "he",
    dir: "rtl",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: APP_BACKGROUND,
    theme_color: APP_BACKGROUND,
    categories: ["sports"],
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
