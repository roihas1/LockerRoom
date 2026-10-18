"use client";

import { useMemo, useState } from "react";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import { formatAverage, formatInt } from "@/lib/utils/numbers";

export interface TrendSeries {
  key: string;
  label: string;
  values: number[];
  /** Dashed secondary line (e.g. rolling average). */
  style?: "solid" | "dashed";
  color?: "team" | "win" | "loss" | "muted";
}

export interface TrendChartPoint {
  id: string | number;
  label: string;
  detail?: string;
}

const COLORS: Record<NonNullable<TrendSeries["color"]>, string> = {
  team: "var(--color-team)",
  win: "var(--color-win)",
  loss: "var(--color-loss)",
  muted: "var(--color-muted)",
};

const PAD = { top: 16, end: 12, bottom: 36, start: 36 };
const HEIGHT = 200;
const MIN_WIDTH = 280;
const POINT_GAP = 48;

function formatValue(v: number): string {
  return Number.isInteger(v) ? formatInt(v) : formatAverage(v);
}

function pathFor(xs: number[], ys: number[]): string {
  return xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i]!.toFixed(1)}`).join(" ");
}

export function TrendChart({
  points,
  series,
  tabs,
  activeTab,
  onTabChange,
  summary,
  className,
}: {
  points: TrendChartPoint[];
  series: TrendSeries[];
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  summary: string;
  className?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const n = points.length;
  const width = Math.max(MIN_WIDTH, PAD.start + PAD.end + Math.max(n - 1, 1) * POINT_GAP);

  const { xs, mapped } = useMemo(() => {
    const allValues = series.flatMap((s) => s.values);
    const min = Math.min(0, ...allValues);
    const max = Math.max(...allValues, 1);
    const span = max - min || 1;
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const plotW = width - PAD.start - PAD.end;
    const xs = points.map((_, i) => PAD.start + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW));
    const mapY = (v: number) => PAD.top + plotH - ((v - min) / span) * plotH;
    const mapped = series.map((s) => ({
      ...s,
      ys: s.values.map(mapY),
      color: COLORS[s.color ?? "team"],
    }));
    return { xs, mapped, min, max };
  }, [points, series, n, width]);

  const activeIndex = selected ?? n - 1;
  const activePoint = points[activeIndex];
  const primary = mapped.find((s) => s.style !== "dashed") ?? mapped[0];
  const activeValue = primary?.values[activeIndex];

  if (n === 0) return null;

  return (
    <div className={cn("card overflow-hidden", className)}>
      {tabs?.length ? (
        <div
          role="tablist"
          aria-label={he.statsPage.trends.selectMetric}
          className="flex gap-1 overflow-x-auto border-b border-border px-2 pt-2 scrollbar-none"
        >
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "shrink-0 rounded-t-lg px-3 py-2 text-sm font-semibold",
                  active ? "bg-team/15 text-team" : "text-muted hover:text-text",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="sr-only">{summary}</p>

      {activePoint && activeValue !== undefined ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3 text-sm" aria-live="polite">
          <p data-user-content className="font-semibold">
            {activePoint.detail ?? activePoint.label}
          </p>
          <p className="num font-bold text-team">
            {formatValue(activeValue)}
            {mapped
              .filter((s) => s.style === "dashed" && s.values[activeIndex] !== undefined)
              .map((s) => (
                <span key={s.key} className="ms-2 text-xs font-medium text-muted">
                  {s.label} {formatValue(s.values[activeIndex]!)}
                </span>
              ))}
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto px-1 pb-2 scrollbar-none" dir="ltr">
        <svg
          role="img"
          aria-label={summary}
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="mx-auto block max-w-none"
        >
          <title>{summary}</title>
          {[0.25, 0.5, 0.75].map((t) => {
            const y = PAD.top + (HEIGHT - PAD.top - PAD.bottom) * t;
            return (
              <line
                key={t}
                x1={PAD.start}
                x2={width - PAD.end}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeDasharray="3 4"
              />
            );
          })}

          {mapped.map((s) => (
            <path
              key={s.key}
              d={pathFor(xs, s.ys)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.style === "dashed" ? 2 : 2.5}
              strokeDasharray={s.style === "dashed" ? "5 4" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={s.style === "dashed" ? 0.75 : 1}
            />
          ))}

          {primary
            ? xs.map((x, i) => {
                const y = primary.ys[i]!;
                const isActive = i === activeIndex;
                return (
                  <g key={points[i]!.id}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isActive ? 6 : 4}
                      fill={isActive ? primary.color : "var(--color-surface)"}
                      stroke={primary.color}
                      strokeWidth={2}
                    />
                    <rect
                      x={x - POINT_GAP / 2}
                      y={PAD.top}
                      width={POINT_GAP}
                      height={HEIGHT - PAD.top - PAD.bottom}
                      fill="transparent"
                      className="cursor-pointer"
                      onClick={() => setSelected(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(i);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={he.statsPage.trends.pointDetail(
                        points[i]!.label,
                        formatValue(primary.values[i]!),
                        formatValue(
                          mapped.find((s) => s.style === "dashed")?.values[i] ?? primary.values[i]!,
                        ),
                      )}
                    />
                    <text
                      x={x}
                      y={HEIGHT - 12}
                      textAnchor="middle"
                      className="fill-muted text-[10px]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {n <= 6 || i === 0 || i === n - 1 || i % 2 === 0 ? truncateLabel(points[i]!.label) : ""}
                    </text>
                  </g>
                );
              })
            : null}
        </svg>
      </div>

      <ul className="flex flex-wrap gap-3 border-t border-border px-4 py-2 text-xs text-muted">
        {mapped.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-0.5 w-4 rounded-full"
              style={{
                backgroundColor: s.color,
                backgroundImage:
                  s.style === "dashed"
                    ? `repeating-linear-gradient(90deg, ${s.color} 0 3px, transparent 3px 6px)`
                    : undefined,
              }}
            />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function truncateLabel(label: string, max = 8): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}
