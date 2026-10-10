import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { APP_BACKGROUND, ballSvgDataUri, loadBrand } from "./brand";
import { stripEmoji, toVisualRtl, wrapLines } from "./bidi";

export const OG_SIZE = { width: 1200, height: 630 };

const fontsPromise = Promise.all([
  readFile(join(process.cwd(), "src/assets/fonts/Heebo-Medium.ttf")),
  readFile(join(process.cwd(), "src/assets/fonts/Heebo-ExtraBold.ttf")),
]);

/** Visual-order Hebrew without emoji: the renderer only does left-to-right and has no emoji font. */
const t = (text: string) => toVisualRtl(stripEmoji(text));

/** Fetches a remote image as a data URI. Only PNG/JPEG render reliably; anything else falls back to no image. */
export async function loadImage(url: string | null | undefined): Promise<string | null> {
  if (!url || !url.startsWith("http")) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/image\/(png|jpe?g)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export interface ShareCard {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: { text: string; tone: "live" | "win" | "loss" | "team" };
  score?: { team: number; opponent: number; teamName: string; opponentName: string };
  image?: string | null;
}

const badgeColors = { live: "#ef4444", win: "#22c55e", loss: "#ef4444", team: "" };

export async function renderShareCard(card: ShareCard) {
  const [brand, [medium, bold]] = await Promise.all([loadBrand(), fontsPromise]);
  const accent = brand.primaryColor;
  const titleLines = wrapLines(stripEmoji(card.title), card.image ? 22 : 30, card.score ? 1 : 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, ${APP_BACKGROUND} 55%, ${accent}55 100%)`,
          color: "#f4f5f7",
          fontFamily: "Heebo",
          padding: 56,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {card.badge ? (
            <div
              style={{
                display: "flex",
                padding: "8px 22px",
                borderRadius: 999,
                fontSize: 30,
                fontWeight: 800,
                background: card.badge.tone === "team" ? accent : badgeColors[card.badge.tone],
                color: card.badge.tone === "team" ? "#000" : "#fff",
              }}
            >
              {t(card.badge.text)}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>{t(brand.name)}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logoUrl ?? ballSvgDataUri(accent)} width={72} height={72} alt="" style={{ borderRadius: 36 }} />
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 48 }}>
          {card.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.image} width={380} height={380} alt="" style={{ borderRadius: 32, objectFit: "cover", border: `6px solid ${accent}` }} />
          ) : null}
          <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
            {card.eyebrow ? <div style={{ display: "flex", fontSize: 34, color: accent, fontWeight: 800 }}>{t(card.eyebrow)}</div> : null}
            {card.score ? (
              <div style={{ display: "flex", alignItems: "center", gap: 36, fontWeight: 800, marginTop: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ display: "flex", fontSize: 150, lineHeight: 1, color: card.score.opponent > card.score.team ? "#fff" : "#9aa1ad" }}>
                    {String(card.score.opponent)}
                  </div>
                  <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "#9aa1ad" }}>{t(card.score.opponentName)}</div>
                </div>
                <div style={{ display: "flex", fontSize: 90, color: "#9aa1ad" }}>:</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ display: "flex", fontSize: 150, lineHeight: 1, color: card.score.team >= card.score.opponent ? "#fff" : "#9aa1ad" }}>
                    {String(card.score.team)}
                  </div>
                  <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "#9aa1ad" }}>{t(card.score.teamName)}</div>
                </div>
              </div>
            ) : (
              titleLines.map((line, i) => (
                <div key={i} style={{ display: "flex", fontSize: card.image ? 64 : 72, fontWeight: 800, lineHeight: 1.15 }}>
                  {toVisualRtl(line)}
                </div>
              ))
            )}
            {card.subtitle ? (
              <div style={{ display: "flex", fontSize: 32, fontWeight: 500, color: "#9aa1ad", marginTop: 8 }}>
                {t(wrapLines(stripEmoji(card.subtitle), 60, 1)[0] ?? "")}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Heebo", data: medium, weight: 500, style: "normal" },
        { name: "Heebo", data: bold, weight: 800, style: "normal" },
      ],
    },
  );
}
