import "server-only";
import sharp from "sharp";

const PASSTHROUGH = /^image\/(png|jpe?g)$/;

/**
 * Fetches a remote image as a data URI for `ImageResponse`. The renderer only decodes PNG/JPEG, so
 * anything else (WebP uploads, AVIF, GIF) is converted to PNG. Returns null on any failure.
 */
export async function loadImage(url: string | null | undefined): Promise<string | null> {
  if (!url || !url.startsWith("http")) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
    const input = Buffer.from(await res.arrayBuffer());
    if (PASSTHROUGH.test(type)) return `data:${type};base64,${input.toString("base64")}`;
    const png = await sharp(input).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
