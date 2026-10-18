/** Normalized half-court point: x 0=left … 1=right, y 0=baseline (hoop) … 1=half-court. */
export type CourtPoint = { x: number; y: number };

export const PLAY_PLAYER_IDS = ["1", "2", "3", "4", "5"] as const;
export type PlayPlayerId = (typeof PLAY_PLAYER_IDS)[number];

export type PlayDiagramAction =
  | { type: "pass"; from: PlayPlayerId; to: PlayPlayerId }
  | { type: "shoot"; shooter: PlayPlayerId };

export type PlayDiagramStep = {
  /** Hebrew caption shown during practice. */
  caption: string;
  positions: Record<PlayPlayerId, CourtPoint>;
  ballHolder: PlayPlayerId;
  /** Optional action that plays when arriving at this step. */
  action?: PlayDiagramAction;
};

export type PlayDiagram = {
  version: 1;
  steps: PlayDiagramStep[];
};
