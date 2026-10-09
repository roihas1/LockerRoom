import { describe, expect, it } from "vitest";
import { MB } from "@/config/uploads";
import { buildStorageKey, checkUpload, isValidStorageKey, mediaSlotField, registerMediaSchema } from "./media";

const uuid = "3f2a9c1e-8b4d-4e6f-9a1b-2c3d4e5f6a7b";

describe("checkUpload", () => {
  it("accepts supported images and videos within limits", () => {
    expect(checkUpload("image/png", 2 * MB)).toEqual({ ok: true, kind: "image", ext: "png" });
    expect(checkUpload("video/mp4", 100 * MB)).toEqual({ ok: true, kind: "video", ext: "mp4" });
  });

  it("rejects unsupported types and oversized files", () => {
    expect(checkUpload("image/gif", 1)).toEqual({ ok: false, reason: "bad_type" });
    expect(checkUpload("image/jpeg", 16 * MB)).toEqual({ ok: false, reason: "too_large" });
  });
});

describe("storage keys", () => {
  it("builds keys under the kind folder", () => {
    expect(buildStorageKey("image", "players", "jpg", uuid)).toBe(`images/players/${uuid}.jpg`);
    expect(buildStorageKey("video", "games", "webm", uuid)).toBe(`videos/games/${uuid}.webm`);
  });

  it("only accepts keys matching the mime type", () => {
    expect(isValidStorageKey(`images/players/${uuid}.jpg`, "image/jpeg")).toBe(true);
    expect(isValidStorageKey(`videos/players/${uuid}.jpg`, "image/jpeg")).toBe(false);
    expect(isValidStorageKey(`images/players/${uuid}.png`, "image/jpeg")).toBe(false);
    expect(isValidStorageKey(`images/../${uuid}.jpg`, "image/jpeg")).toBe(false);
    expect(isValidStorageKey(`images/other/${uuid}.jpg`, "image/jpeg")).toBe(false);
  });

  it("rejects registering media for both a game and a post", () => {
    const base = { storageKey: `images/games/${uuid}.jpg`, mimeType: "image/jpeg", sizeBytes: 10 };
    expect(registerMediaSchema.safeParse({ ...base, gameId: 1 }).success).toBe(true);
    expect(registerMediaSchema.safeParse({ ...base, gameId: 1, postId: 2 }).success).toBe(false);
  });
});

describe("mediaSlotField", () => {
  it("distinguishes missing, cleared and set", () => {
    expect(mediaSlotField.parse(null)).toBeUndefined();
    expect(mediaSlotField.parse("")).toBeNull();
    expect(mediaSlotField.parse(uuid)).toBe(uuid);
    expect(mediaSlotField.safeParse("not-a-uuid").success).toBe(false);
  });
});
