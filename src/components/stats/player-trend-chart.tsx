"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { TrendChart } from "@/components/stats/trend-chart";
import { he } from "@/config/strings";
import {
  metricValue,
  rollingMetricValue,
  type PlayerTrendMetric,
  type PlayerTrendPoint,
} from "@/lib/stats/trends";
import { formatAverage, formatInt } from "@/lib/utils/numbers";

const METRICS: PlayerTrendMetric[] = ["points", "rebounds", "assists", "pir"];

function fmt(v: number): string {
  return Number.isInteger(v) ? formatInt(v) : formatAverage(v);
}

export function PlayerTrendChart({ points }: { points: PlayerTrendPoint[] }) {
  const [metric, setMetric] = useState<PlayerTrendMetric>("points");

  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => metricValue(p, metric));
    const rolling = points.map((p) => rollingMetricValue(p, metric));
    const label = he.statsPage.trends.metrics[metric];
    return {
      points: points.map((p) => ({
        id: p.gameId,
        label: p.opponent,
        detail: `${he.result.vs} ${p.opponent}`,
      })),
      series: [
        { key: "value", label, values, style: "solid" as const, color: "team" as const },
        {
          key: "rolling",
          label: he.statsPage.trends.rolling,
          values: rolling,
          style: "dashed" as const,
          color: "muted" as const,
        },
      ],
      summary: he.statsPage.trends.summary(label, fmt(values[0]!), fmt(values.at(-1)!), points.length),
    };
  }, [points, metric]);

  if (points.length < 2) {
    return <EmptyState emoji="📈" title={he.statsPage.trends.playerTitle} text={he.statsPage.trends.emptyPlayer} />;
  }
  if (!chart) return null;

  return (
    <TrendChart
      points={chart.points}
      series={chart.series}
      tabs={METRICS.map((m) => ({ id: m, label: he.statsPage.trends.metrics[m] }))}
      activeTab={metric}
      onTabChange={(id) => setMetric(id as PlayerTrendMetric)}
      summary={chart.summary}
    />
  );
}
