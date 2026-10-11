import { describe, expect, it } from "vitest";
import {
  OUR_TEAM_ID,
  applyChanges,
  diffEvent,
  matchEvents,
  snapshotFromEvent,
  type IbbaEvent,
  type LocalGame,
} from "../../../supabase/functions/_shared/ibba-diff";

const mkEvent = (over: Partial<IbbaEvent> & Pick<IbbaEvent, "id" | "date" | "teams">): IbbaEvent => ({
  status: "future",
  venues: [18172],
  venueName: "רח' שמואל הנגיד 23, הרצליה",
  teamNames: { 595763: "מכבי רעננה יאיר", [OUR_TEAM_ID]: "בני הרצליה קליין" },
  homePoints: 0,
  awayPoints: 0,
  ...over,
});

const mkGame = (over: Partial<LocalGame>): LocalGame => ({
  id: 4,
  opponent: "מכבי רעננה יאיר",
  tipoffAt: "2026-10-28T17:00:00.000Z",
  location: "לב הפארק",
  homeAway: "away",
  status: "scheduled",
  teamScore: null,
  opponentScore: null,
  ibbaEventId: null,
  ibbaSnapshot: null,
  ...over,
});

describe("matchEvents", () => {
  it("matches by opponent and date", () => {
    const games = [mkGame({ id: 4, tipoffAt: "2026-10-28T17:00:00.000Z" })];
    const events = [mkEvent({ id: 1, date: "2026-10-28T20:30:00", teams: [595763, OUR_TEAM_ID] })];
    const m = matchEvents(games, events);
    expect(m.get(4)?.id).toBe(1);
  });

  it("falls back to date when opponent name differs", () => {
    const games = [mkGame({ id: 19, opponent: "מכבי רעננה ים", tipoffAt: "2027-03-31T17:00:00.000Z" })];
    const events = [
      mkEvent({
        id: 2,
        date: "2027-03-31T20:30:00",
        teams: [1499997, OUR_TEAM_ID],
        teamNames: { 1499997: "מכבי רעננה נועם", [OUR_TEAM_ID]: "בני הרצליה קליין" },
      }),
    ];
    expect(matchEvents(games, events).get(19)?.id).toBe(2);
  });
});

describe("quiet baseline", () => {
  it("linked snapshot with no IBBA delta yields no applicable changes", () => {
    const event = mkEvent({ id: 1, date: "2026-10-28T20:30:00", teams: [595763, OUR_TEAM_ID] });
    const snap = snapshotFromEvent(event);
    const game = mkGame({ ibbaEventId: 1, ibbaSnapshot: snap });
    expect(diffEvent(snap, event)).toEqual([]);
    expect(applyChanges(game, [], event).tipoffAt).toBeUndefined();
  });
});

describe("diffEvent and applyChanges", () => {
  it("detects IBBA time change and shifts tipoff by the same delta", () => {
    const event = mkEvent({ id: 1, date: "2026-10-28T20:30:00", teams: [595763, OUR_TEAM_ID] });
    const snap = snapshotFromEvent(event);
    const later = mkEvent({ id: 1, date: "2026-10-28T21:00:00", teams: [595763, OUR_TEAM_ID] });
    const game = mkGame({ tipoffAt: "2026-10-28T17:00:00.000Z", ibbaSnapshot: snap });
    const changes = diffEvent(snap, later);
    expect(changes.some((c) => c.kind === "time")).toBe(true);
    const applied = applyChanges(game, changes, later);
    expect(applied.tipoffAt).toBe(new Date("2026-10-28T17:30:00.000Z").toISOString());
  });

  it("fills scores when empty and IBBA reports a result", () => {
    const event = mkEvent({
      id: 1,
      date: "2026-10-28T20:30:00",
      teams: [595763, OUR_TEAM_ID],
      homePoints: 70,
      awayPoints: 65,
      status: "publish",
    });
    const snap = snapshotFromEvent({ ...event, homePoints: 0, awayPoints: 0 });
    const game = mkGame({ ibbaSnapshot: snap });
    const changes = diffEvent(snap, event);
    const applied = applyChanges(game, changes, event);
    expect(applied.teamScore).toBe(65);
    expect(applied.opponentScore).toBe(70);
    expect(applied.status).toBe("final");
  });

  it("does not overwrite admin-entered scores", () => {
    const event = mkEvent({
      id: 1,
      date: "2026-10-28T20:30:00",
      teams: [595763, OUR_TEAM_ID],
      homePoints: 80,
      awayPoints: 75,
      status: "publish",
    });
    const snap = snapshotFromEvent({ ...event, homePoints: 0, awayPoints: 0 });
    const game = mkGame({ ibbaSnapshot: snap, teamScore: 60, opponentScore: 55 });
    const changes = diffEvent(snap, event);
    const applied = applyChanges(game, changes, event);
    expect(applied.teamScore).toBeUndefined();
  });
});
