import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { getData } from "@/lib/data";

export const APP_BACKGROUND = "#0a0b0d";

interface Brand {
  name: string;
  shortName: string;
  primaryColor: string;
}

/** Team name and color for generated images. Falls back to defaults so icons never fail to render. */
export async function loadBrand(): Promise<Brand> {
  try {
    const team = await getData().getTeam();
    return { name: team.name, shortName: team.shortName, primaryColor: team.primaryColor };
  } catch {
    return siteConfig.defaultTeam;
  }
}

/** The app's own mark (ball dropping through a hoop), shared with the site header via the same file. */
const MARK_SVG = readFileSync(join(process.cwd(), "src/assets/brand/mark.svg"), "utf8");
const MARK_INNER = MARK_SVG.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

const toDataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** Mixes a #rrggbb color toward black (amount < 0) or white (amount > 0). */
function shade(hex: string, amount: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  const channels = [0, 2, 4].map((i) => parseInt(match[1]!.slice(i, i + 2), 16));
  return `#${channels.map((c) => Math.round(c + (target - c) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** The mark on a team-color gradient tile. `scale` shrinks the mark, e.g. to fit Android's maskable safe zone. */
export function markTileDataUri(color: string, { scale = 0.92, rounded = false } = {}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><radialGradient id="tile" cx="50%" cy="28%" r="80%"><stop offset="0" stop-color="${shade(color, 0.15)}"/><stop offset="0.35" stop-color="${color}"/><stop offset="0.8" stop-color="${shade(color, -0.6)}"/><stop offset="1" stop-color="${shade(color, -0.78)}"/></radialGradient></defs><rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#tile)"/><g transform="translate(256 262) scale(${scale}) translate(-256 -256)">${MARK_INNER}</g></svg>`;
  return toDataUri(svg);
}

/**
 * Square app icon. iOS rounds the corners itself; maskable icons shrink the mark into the circle Android
 * crops to. The favicon gets rounded corners because browsers show it as-is.
 */
export async function renderAppIcon(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  const brand = await loadBrand();
  const src = markTileDataUri(brand.primaryColor, { scale: maskable ? 0.72 : 0.92, rounded: size < 64 });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={size} height={size} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}

const BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"><circle cx="48" cy="48" r="38"/><path d="M10 48h76"/><path d="M48 10v76"/><path d="M22 21c13 14 13 40 0 54"/><path d="M74 21c-13 14-13 40 0 54"/></g></svg>`;

/** Android status-bar badge: only the alpha channel is used, so it must be a white silhouette on transparent. */
export function renderBadgeIcon(size: number) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={toDataUri(BADGE_SVG)} width={size} height={size} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
