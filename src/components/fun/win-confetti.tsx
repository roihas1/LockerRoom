"use client";

import { useEffect, useRef } from "react";

const PIECES = 140;
const DURATION_MS = 3500;
const GRAVITY = 0.25;
const DRAG = 0.985;

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

/** Full-screen confetti burst, once per browser session for each `id`. */
export function WinConfetti({ id }: { id: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const storageKey = `confetti:${id}`;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = teamColors();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pieces: Piece[] = Array.from({ length: PIECES }, (_, i) => {
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
    const tick = (now: number) => {
      const elapsed = now - start;
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
    frame = requestAnimationFrame(tick);

    return () => {
      // Interrupted bursts (including Strict Mode's dev double-mount) should be allowed to replay.
      if (!done) sessionStorage.removeItem(storageKey);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [id]);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50 size-full" aria-hidden />;
}
