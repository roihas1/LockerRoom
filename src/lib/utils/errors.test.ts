import { describe, expect, it } from "vitest";
import { he } from "@/config/strings";
import { mapError } from "./errors";

describe("mapError", () => {
  it("maps invalid login credentials", () => {
    expect(mapError({ message: "Invalid login credentials" }).message).toBe(he.errors.invalidCredentials);
  });

  it("maps duplicate jersey constraint", () => {
    expect(mapError({ code: "23505", message: "players_active_jersey" }).message).toBe(he.errors.duplicateJersey);
  });

  it("maps duplicate round constraint", () => {
    expect(mapError({ code: "23505", details: "games_round_unique" }).message).toBe(he.errors.duplicateRound);
  });

  it("maps self demote rpc", () => {
    expect(mapError({ code: "P0001", message: "self_demote" }).message).toBe(he.errors.selfDemote);
  });

  it("maps last admin rpc", () => {
    expect(mapError({ code: "P0001", message: "last_admin" }).message).toBe(he.errors.lastAdmin);
  });
});
