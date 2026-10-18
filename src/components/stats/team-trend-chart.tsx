"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { TrendChart } from "@/components/stats/trend-chart";
import { he } from "@/config/strings";
import type { TeamTrendPoint } from "@/lib/stats/trends";
import { formatAverage, formatInt } from "@/lib/utils/numbers";

function fmt(v: number): string {
  return Number.isInteger(v) ? formatInt(v) : formatAverage(v);
}

export function TeamTrendChart({ points }: { points: TeamTrendPoint[] }) {
  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const scored = points.map((p) => p.teamScore);
    const allowed = points.map((p) => p.opponentScore);
    return {
      points: points.map((p) => ({
        id: p.gameId,
        label: p.opponent,
        detail: `${he.result.vs} ${p.opponent}`,
      })),
      series: [
        {
          key: "scored",
          label: he.statsPage.trends.scored,
          values: scored,
          style: "solid" as const,
          color: "win" as const,
        },
        {
          key: "allowed",
          label: he.statsPage.trends.allowed,
          values: allowed,
          style: "solid" as const,
          color: "loss" as const,
        },
        {
          key: "rollingScored",
          label: `${he.statsPage.trends.rolling} · ${he.statsPage.trends.scored}`,
          values: points.map((p) => p.rollingTeamScore),
          style: "dashed" as const,
          color: "muted" as const,
        },
      ],
      summary: he.statsPage.trends.summary(
        he.statsPage.trends.scored,
        fmt(scored[0]!),
        fmt(scored.at(-1)!),
        points.length,
      ),
    };
  }, [points]);

  if (points.length < 2) {
    return <EmptyState emoji="📈" title={he.statsPage.trends.teamTitle} text={he.statsPage.trends.emptyTeam} />;
  }
  if (!chart) return null;

  return <TrendChart points={chart.points} series={chart.series} summary={chart.summary} />;
}
