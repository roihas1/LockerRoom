"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { HalfCourtSvg } from "@/components/practice/half-court-svg";
import { COURT_VB, HOOP_SVG, pointToSvg, svgToPoint } from "@/lib/play-diagram/court-math";
import { cn } from "@/lib/utils/cn";
import type { CourtPoint, PlayPlayerId } from "@/types/play-diagram";
import { PLAY_PLAYER_IDS } from "@/types/play-diagram";

export type BallFlight =
  | { kind: "pass"; from: CourtPoint; to: CourtPoint; t: number }
  | { kind: "shoot"; from: CourtPoint; t: number }
  | null;

type PlayCourtProps = {
  positions: Record<PlayPlayerId, CourtPoint>;
  ballHolder: PlayPlayerId;
  /** When set, ball is in flight instead of on a player. */
  ballFlight?: BallFlight;
  /** Faint target spots for hints. */
  ghostPositions?: Record<PlayPlayerId, CourtPoint> | null;
  interactive?: boolean;
  /** Highlight player as pass target selection. */
  selectedId?: PlayPlayerId | null;
  className?: string;
  onDragPlayer?: (id: PlayPlayerId, point: CourtPoint) => void;
  onTapPlayer?: (id: PlayPlayerId) => void;
};

const PLAYER_R = 18;

export function PlayCourt({
  positions,
  ballHolder,
  ballFlight = null,
  ghostPositions = null,
  interactive = false,
  selectedId = null,
  className,
  onDragPlayer,
  onTapPlayer,
}: PlayCourtProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: PlayPlayerId; pointerId: number } | null>(null);
  const [draggingId, setDraggingId] = useState<PlayPlayerId | null>(null);
  const movedRef = useRef(false);

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }, []);

  const onPointerDown = (id: PlayPlayerId, e: ReactPointerEvent) => {
    if (!interactive) {
      onTapPlayer?.(id);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id, pointerId: e.pointerId };
    movedRef.current = false;
    setDraggingId(id);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const local = clientToSvg(e.clientX, e.clientY);
    if (!local) return;
    movedRef.current = true;
    onDragPlayer?.(drag.id, svgToPoint(local.x, local.y));
  };

  const endDrag = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDraggingId(null);
    if (!movedRef.current) onTapPlayer?.(drag.id);
  };

  let ballSvg: { x: number; y: number } | null = null;
  if (ballFlight?.kind === "pass") {
    const t = ballFlight.t;
    const a = pointToSvg(ballFlight.from);
    const b = pointToSvg(ballFlight.to);
    ballSvg = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 28 };
  } else if (ballFlight?.kind === "shoot") {
    const t = ballFlight.t;
    const a = pointToSvg(ballFlight.from);
    ballSvg = {
      x: a.x + (HOOP_SVG.x - a.x) * t,
      y: a.y + (HOOP_SVG.y - a.y) * t - Math.sin(t * Math.PI) * 50,
    };
  } else {
    const p = pointToSvg(positions[ballHolder]);
    ballSvg = { x: p.x + 12, y: p.y - 14 };
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${COURT_VB.w} ${COURT_VB.h}`}
      className={cn("w-full touch-none select-none rounded-xl bg-[#0c1220]", className)}
      role="img"
      aria-label="מגרש חצי"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <HalfCourtSvg />
      {ghostPositions
        ? PLAY_PLAYER_IDS.map((id) => {
            const { x, y } = pointToSvg(ghostPositions[id]);
            return (
              <g key={`ghost-${id}`} transform={`translate(${x} ${y})`} style={{ pointerEvents: "none" }}>
                <circle r={PLAYER_R} className="fill-none stroke-team-2" strokeWidth={2} strokeDasharray="5 4" opacity={0.7} />
                <text textAnchor="middle" dominantBaseline="central" className="num fill-team-2 text-[14px] font-bold" opacity={0.75}>
                  {id}
                </text>
              </g>
            );
          })
        : null}
      {PLAY_PLAYER_IDS.map((id) => {
        const { x, y } = pointToSvg(positions[id]);
        const isBall = id === ballHolder && !ballFlight;
        const isSelected = selectedId === id;
        return (
          <g
            key={id}
            transform={`translate(${x} ${y})`}
            style={{ cursor: interactive ? "grab" : onTapPlayer ? "pointer" : "default" }}
            onPointerDown={(e) => onPointerDown(id, e)}
          >
            <circle
              r={PLAYER_R + (draggingId === id || isSelected ? 3 : 0)}
              className={cn(
                isSelected ? "fill-team-2" : "fill-team",
                isBall && "stroke-white",
              )}
              strokeWidth={isBall ? 3 : 0}
              opacity={0.95}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="num fill-black text-[16px] font-black"
              style={{ pointerEvents: "none" }}
            >
              {id}
            </text>
          </g>
        );
      })}
      {ballSvg ? (
        <circle cx={ballSvg.x} cy={ballSvg.y} r={7} className="fill-orange-400 stroke-orange-700" strokeWidth={1.5} />
      ) : null}
    </svg>
  );
}
