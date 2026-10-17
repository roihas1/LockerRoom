import { describe, expect, it } from "vitest";
import type { Game, Team } from "@/types/domain";
import { buildIcs, gameCalendarEvent, gameDayReminder, googleCalendarUrl, isCalendarEligible } from "./calendar";

const team: Team = {
  name: "בני הרצליה",
  shortName: "קליין",
  description: null,
  primaryColor: "#2563eb",
  secondaryColor: "#ffffff",
  logo: null,
  cover: null,
};

const game: Game = {
  id: 4,
  seasonId: 1,
  roundNumber: 1,
  opponent: "מכבי רעננה יאיר",
  tipoffAt: "2026-10-28T18:00:00Z",
  location: "לב הפארק, רח' יאיר שטרן 3, רעננה",
  homeAway: "away",
  status: "scheduled",
  teamScore: null,
  opponentScore: null,
  recap: null,
  playerOfGameId: null,
  potgNote: null,
  playOfGameMediaId: null,
  isPublished: true,
  isPractice: false,
};

describe("gameCalendarEvent", () => {
  it("puts the host team first and links back to the game", () => {
    const event = gameCalendarEvent(game, team, "https://example.com/");
    expect(event.title).toBe("מכבי רעננה יאיר נגד בני הרצליה");
    expect(event.url).toBe("https://example.com/games/4");
    expect(event.end.toISOString()).toBe("2026-10-28T20:30:00.000Z");
    expect(gameCalendarEvent({ ...game, homeAway: "home" }, team, "https://example.com").title).toBe(
      "בני הרצליה נגד מכבי רעננה יאיר",
    );
  });
});

describe("googleCalendarUrl", () => {
  it("encodes UTC dates", () => {
    const url = new URL(googleCalendarUrl(gameCalendarEvent(game, team, "https://example.com")));
    expect(url.searchParams.get("dates")).toBe("20261028T180000Z/20261028T203000Z");
    expect(url.searchParams.get("location")).toBe(game.location);
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(gameCalendarEvent(game, team, "https://example.com"), new Date("2026-10-09T00:00:00Z"));

  it("escapes text and uses CRLF line endings", () => {
    expect(ics).toContain("DTSTART:20261028T180000Z\r\n");
    expect(ics).toContain("LOCATION:לב הפארק\\, רח' יאיר שטרן 3\\, רעננה");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("keeps every line within 75 octets", () => {
    const encoder = new TextEncoder();
    for (const line of ics.split("\r\n")) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
  });
});

describe("gameDayReminder", () => {
  it("alerts at 09:00 Israel time on game day, across DST", () => {
    expect(gameDayReminder(new Date("2026-10-28T18:00:00Z")).toISOString()).toBe("2026-10-28T07:00:00.000Z");
    expect(gameDayReminder(new Date("2026-07-14T17:00:00Z")).toISOString()).toBe("2026-07-14T06:00:00.000Z");
  });

  it("falls back to an hour before early tip-offs", () => {
    expect(gameDayReminder(new Date("2026-10-28T06:30:00Z")).toISOString()).toBe("2026-10-28T05:30:00.000Z");
  });
});

describe("calendar feed", () => {
  const events = [game, { ...game, id: 5, status: "final" as const }].map((g) =>
    gameCalendarEvent(g, team, "https://example.com"),
  );
  const ics = buildIcs(events, new Date("2026-10-09T00:00:00Z"), team.name);

  it("contains every game and alarms only upcoming ones", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(1);
    expect(ics).toContain("TRIGGER;VALUE=DATE-TIME:20261028T070000Z\r\n");
    expect(ics).toContain("X-WR-CALNAME:");
  });
});

describe("isCalendarEligible", () => {
  it("only offers upcoming games", () => {
    expect(isCalendarEligible(game)).toBe(true);
    expect(isCalendarEligible({ ...game, status: "final" })).toBe(false);
  });
});
