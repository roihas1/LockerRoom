import type { CourtPoint } from "@/types/play-diagram";

export const COURT_VB = { w: 500, h: 470 } as const;

const PAD = { x: 36, top: 28, bottom: 36 };

export function pointToSvg(p: CourtPoint): { x: number; y: number } {
  const innerW = COURT_VB.w - PAD.x * 2;
  const innerH = COURT_VB.h - PAD.top - PAD.bottom;
  return {
    x: PAD.x + p.x * innerW,
    y: PAD.top + p.y * innerH,
  };
}

export function svgToPoint(x: number, y: number): CourtPoint {
  const innerW = COURT_VB.w - PAD.x * 2;
  const innerH = COURT_VB.h - PAD.top - PAD.bottom;
  return {
    x: Math.min(1, Math.max(0, (x - PAD.x) / innerW)),
    y: Math.min(1, Math.max(0, (y - PAD.top) / innerH)),
  };
}

/** Hoop rim center in SVG coords (for shoot animation). */
export const HOOP_SVG = { x: COURT_VB.w / 2, y: PAD.top + 18 };

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpPoint(a: CourtPoint, b: CourtPoint, t: number): CourtPoint {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
