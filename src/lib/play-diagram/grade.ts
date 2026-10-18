import type { CourtPoint, PlayDiagramAction, PlayDiagramStep, PlayPlayerId } from "@/types/play-diagram";
import { PLAY_PLAYER_IDS } from "@/types/play-diagram";

/** Max distance (normalized court units) for a player to count as “close enough”. */
export const POSITION_TOLERANCE = 0.2;

export type GradeReason = "positions" | "pass" | "shoot" | "action_missing" | "ball" | "ok";

export type GradeResult = {
  ok: boolean;
  reasons: GradeReason[];
};

function dist(a: CourtPoint, b: CourtPoint) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function gradeStep(
  target: PlayDiagramStep,
  positions: Record<PlayPlayerId, CourtPoint>,
  ballHolder: PlayPlayerId,
  lastAction: PlayDiagramAction | null,
): GradeResult {
  const reasons: GradeReason[] = [];

  const positionsOk = PLAY_PLAYER_IDS.every((id) => dist(positions[id], target.positions[id]) <= POSITION_TOLERANCE);
  if (!positionsOk) reasons.push("positions");

  if (target.action?.type === "pass") {
    if (!lastAction || lastAction.type !== "pass") reasons.push("action_missing");
    else if (lastAction.from !== target.action.from || lastAction.to !== target.action.to) reasons.push("pass");
  } else if (target.action?.type === "shoot") {
    if (!lastAction || lastAction.type !== "shoot") reasons.push("action_missing");
    else if (lastAction.shooter !== target.action.shooter) reasons.push("shoot");
  }

  if (ballHolder !== target.ballHolder) reasons.push("ball");

  if (reasons.length === 0) return { ok: true, reasons: ["ok"] };
  return { ok: false, reasons };
}
