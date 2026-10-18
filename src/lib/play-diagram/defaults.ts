import type { CourtPoint, PlayDiagram, PlayDiagramStep, PlayPlayerId } from "@/types/play-diagram";
import { PLAY_PLAYER_IDS } from "@/types/play-diagram";

/** Classic 1-up / wings / elbows start — good default for most set plays. */
export const DEFAULT_POSITIONS: Record<PlayPlayerId, CourtPoint> = {
  "1": { x: 0.5, y: 0.78 },
  "2": { x: 0.12, y: 0.55 },
  "3": { x: 0.88, y: 0.55 },
  "4": { x: 0.32, y: 0.38 },
  "5": { x: 0.68, y: 0.38 },
};

export function clonePositions(positions: Record<PlayPlayerId, CourtPoint>): Record<PlayPlayerId, CourtPoint> {
  return PLAY_PLAYER_IDS.reduce(
    (acc, id) => {
      acc[id] = { ...positions[id] };
      return acc;
    },
    {} as Record<PlayPlayerId, CourtPoint>,
  );
}

export function createEmptyStep(caption = ""): PlayDiagramStep {
  return {
    caption,
    positions: clonePositions(DEFAULT_POSITIONS),
    ballHolder: "1",
  };
}

export function createEmptyDiagram(): PlayDiagram {
  return { version: 1, steps: [createEmptyStep()] };
}

/** Sample: central pick-and-roll (matches fixture play #1). */
export function samplePickAndRollDiagram(): PlayDiagram {
  return {
    version: 1,
    steps: [
      {
        caption: "הרכז בראש הקשת, הסנטר מוכן לעלות לחסימה.",
        positions: {
          "1": { x: 0.5, y: 0.78 },
          "2": { x: 0.1, y: 0.52 },
          "3": { x: 0.9, y: 0.52 },
          "4": { x: 0.22, y: 0.28 },
          "5": { x: 0.5, y: 0.42 },
        },
        ballHolder: "1",
      },
      {
        caption: "הסנטר עולה ושם חסימה על המגן של הרכז.",
        positions: {
          "1": { x: 0.5, y: 0.72 },
          "2": { x: 0.1, y: 0.52 },
          "3": { x: 0.9, y: 0.52 },
          "4": { x: 0.22, y: 0.28 },
          "5": { x: 0.5, y: 0.58 },
        },
        ballHolder: "1",
      },
      {
        caption: "הרכז יוצא מהחסימה לכיוון הסל.",
        positions: {
          "1": { x: 0.38, y: 0.42 },
          "2": { x: 0.1, y: 0.52 },
          "3": { x: 0.9, y: 0.52 },
          "4": { x: 0.22, y: 0.28 },
          "5": { x: 0.52, y: 0.55 },
        },
        ballHolder: "1",
      },
      {
        caption: "הסנטר מתגלגל לטבעת — מסירה מהרכז.",
        positions: {
          "1": { x: 0.32, y: 0.36 },
          "2": { x: 0.1, y: 0.52 },
          "3": { x: 0.9, y: 0.52 },
          "4": { x: 0.22, y: 0.28 },
          "5": { x: 0.5, y: 0.2 },
        },
        ballHolder: "5",
        action: { type: "pass", from: "1", to: "5" },
      },
      {
        caption: "סיום קרוב לסל.",
        positions: {
          "1": { x: 0.32, y: 0.36 },
          "2": { x: 0.1, y: 0.52 },
          "3": { x: 0.9, y: 0.52 },
          "4": { x: 0.22, y: 0.28 },
          "5": { x: 0.5, y: 0.16 },
        },
        ballHolder: "5",
        action: { type: "shoot", shooter: "5" },
      },
    ],
  };
}

/** Sample: Horns set (matches fixture play #3). */
export function sampleHornsDiagram(): PlayDiagram {
  return {
    version: 1,
    steps: [
      {
        caption: "שני הגבוהים בקצוות קו העונשין, קלעים בפינות.",
        positions: {
          "1": { x: 0.5, y: 0.82 },
          "2": { x: 0.08, y: 0.32 },
          "3": { x: 0.92, y: 0.32 },
          "4": { x: 0.35, y: 0.48 },
          "5": { x: 0.65, y: 0.48 },
        },
        ballHolder: "1",
      },
      {
        caption: "הרכז בוחר צד ויוצא מחסימה של 4.",
        positions: {
          "1": { x: 0.28, y: 0.5 },
          "2": { x: 0.08, y: 0.32 },
          "3": { x: 0.92, y: 0.32 },
          "4": { x: 0.35, y: 0.48 },
          "5": { x: 0.65, y: 0.48 },
        },
        ballHolder: "1",
      },
      {
        caption: "מסירה ל־5 שיוצא החוצה לזריקה.",
        positions: {
          "1": { x: 0.28, y: 0.42 },
          "2": { x: 0.08, y: 0.32 },
          "3": { x: 0.92, y: 0.32 },
          "4": { x: 0.38, y: 0.22 },
          "5": { x: 0.72, y: 0.62 },
        },
        ballHolder: "5",
        action: { type: "pass", from: "1", to: "5" },
      },
      {
        caption: "זריקה מהקשת.",
        positions: {
          "1": { x: 0.28, y: 0.42 },
          "2": { x: 0.08, y: 0.32 },
          "3": { x: 0.92, y: 0.32 },
          "4": { x: 0.38, y: 0.22 },
          "5": { x: 0.72, y: 0.62 },
        },
        ballHolder: "5",
        action: { type: "shoot", shooter: "5" },
      },
    ],
  };
}
