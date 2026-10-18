import { COURT_VB, HOOP_SVG } from "@/lib/play-diagram/court-math";

/** Static half-court lines (basket at top). */
export function HalfCourtSvg() {
  const { w, h } = COURT_VB;
  const cx = w / 2;
  const baseline = 28;
  const laneW = 120;
  const laneH = 150;
  const ftY = baseline + laneH;
  const ftR = 55;
  const threeR = 190;

  return (
    <g fill="none" stroke="currentColor" strokeOpacity={0.45} strokeWidth={2.5} className="text-team">
      {/* Sidelines + baseline + half-court */}
      <rect x={36} y={baseline} width={w - 72} height={h - baseline - 36} rx={4} />
      {/* Lane */}
      <rect x={cx - laneW / 2} y={baseline} width={laneW} height={laneH} />
      {/* Free-throw circle (bottom half) */}
      <path d={`M ${cx - ftR} ${ftY} A ${ftR} ${ftR} 0 0 0 ${cx + ftR} ${ftY}`} />
      <path d={`M ${cx - ftR} ${ftY} A ${ftR} ${ftR} 0 0 1 ${cx + ftR} ${ftY}`} strokeDasharray="8 7" strokeOpacity={0.3} />
      {/* Restricted area */}
      <path d={`M ${cx - 40} ${baseline} A 40 40 0 0 0 ${cx + 40} ${baseline}`} />
      {/* Three-point arc */}
      <path
        d={`M 56 ${baseline + 40}
            L 56 ${baseline + 70}
            A ${threeR} ${threeR} 0 0 0 ${w - 56} ${baseline + 70}
            L ${w - 56} ${baseline + 40}`}
      />
      {/* Backboard + rim */}
      <line x1={cx - 28} y1={baseline + 6} x2={cx + 28} y2={baseline + 6} strokeWidth={3.5} strokeOpacity={0.7} />
      <circle cx={HOOP_SVG.x} cy={HOOP_SVG.y} r={10} strokeWidth={2.5} strokeOpacity={0.85} />
      <circle cx={HOOP_SVG.x} cy={HOOP_SVG.y} r={3} fill="currentColor" stroke="none" opacity={0.5} />
    </g>
  );
}
