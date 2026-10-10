import "server-only";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { getData } from "@/lib/data";
import { getMediaUrl, isSvg } from "@/lib/storage/urls";

export const APP_BACKGROUND = "#0a0b0d";

interface Brand {
  name: string;
  shortName: string;
  primaryColor: string;
  logoUrl: string | null;
}

/** Team branding for generated images. Falls back to defaults so icons never fail to render. */
export async function loadBrand(): Promise<Brand> {
  try {
    const team = await getData().getTeam();
    const logo = getMediaUrl(team.logo);
    return {
      name: team.name,
      shortName: team.shortName,
      primaryColor: team.primaryColor,
      logoUrl: logo && !isSvg(logo) && logo.startsWith("http") ? logo : null,
    };
  } catch {
    return { ...siteConfig.defaultTeam, logoUrl: null };
  }
}

export function ballSvgDataUri(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="g" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffb26b"/><stop offset="0.55" stop-color="${color}"/><stop offset="1" stop-color="#9a3412"/></radialGradient></defs><circle cx="100" cy="100" r="92" fill="${APP_BACKGROUND}" stroke="#ffffff" stroke-width="6"/><circle cx="100" cy="100" r="70" fill="url(#g)"/><g fill="none" stroke="#1a0d05" stroke-width="5" stroke-linecap="round"><path d="M30 100h140"/><path d="M100 30v140"/><path d="M52 50c22 22 22 78 0 100"/><path d="M148 50c-22 22-22 78 0 100"/></g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Square app icon. Maskable icons keep the mark inside the 80% safe zone Android crops to. */
export async function renderAppIcon(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  const brand = await loadBrand();
  const inner = Math.round(size * (maskable ? 0.62 : 0.9));
  const src = brand.logoUrl ?? ballSvgDataUri(brand.primaryColor);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: APP_BACKGROUND,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={inner} height={inner} alt="" style={{ borderRadius: brand.logoUrl ? inner / 2 : 0 }} />
      </div>
    ),
    { width: size, height: size },
  );
}
