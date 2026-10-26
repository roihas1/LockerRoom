"use client";

import { useEffect, useRef } from "react";

const DURATION_MS = 3500;
const GRAVITY = 0.25;
const DRAG = 0.985;
/** Full-screen canvas at 3x DPR is a large GPU allocation on iPhones; keep it modest. */
const MAX_DPR = 1.5;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
}

function teamColors(): string[] {
  const styles = getComputedStyle(document.documentElement);
  const primary = styles.getPropertyValue("--team-primary").trim() || "#2563eb";
  const secondary = styles.getPropertyValue("--team-secondary").trim() || "#ffffff";
  return [primary, secondary, "#f59e0b", "#22c55e", "#f97316"];
}

function pieceCount(): number {
  const w = window.innerWidth;
  if (w < 480) return 48;
  if (w < 768) return 72;
  return 100;
}

/** Full-screen confetti burst, once per browser session for each `id`. */
export function WinConfetti({ id }: { id: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const storageKey = `confetti:${id}`;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = teamColors();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pieces: Piece[] = Array.from({ length: pieceCount() }, (_, i) => {
      const fromStart = i % 2 === 0;
      const angle = (fromStart ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.8;
      const speed = 10 + Math.random() * 9;
      return {
        x: fromStart ? 0 : w,
        y: h * 0.75,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length]!,
      };
    });

    const start = performance.now();
    let frame = 0;
    let done = false;
    let pausedAt: number | null = null;
    let pauseOffset = 0;

    const tick = (now: number) => {
      if (document.visibilityState !== "visible") {
        pausedAt ??= now;
        return;
      }
      if (pausedAt != null) {
        pauseOffset += now - pausedAt;
        pausedAt = null;
      }
      const elapsed = now - start - pauseOffset;
      done = elapsed >= DURATION_MS;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.max(0, 1 - elapsed / DURATION_MS);
      for (const p of pieces) {
        p.vx *= DRAG;
        p.vy = p.vy * DRAG + GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (done) ctx.clearRect(0, 0, w, h);
      else frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (done || document.visibilityState !== "visible") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(tick);

    return () => {
      // Interrupted bursts (including Strict Mode's dev double-mount) should be allowed to replay.
      if (!done) sessionStorage.removeItem(storageKey);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [id]);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50 size-full" aria-hidden />;
}
