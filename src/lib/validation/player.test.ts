import { describe, expect, it } from "vitest";
import { parsePlayerForm } from "./player";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  fd.set("name", "דניאל לוי");
  fd.set("jerseyNumber", "");
  fd.set("position", "");
  fd.set("heightCm", "");
  fd.set("isActive", "on");
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("parsePlayerForm hashtag", () => {
  it("strips a leading # and surrounding spaces", () => {
    const parsed = parsePlayerForm(form({ hashtag: "  #המנוע " }));
    expect(parsed.success && parsed.data.hashtag).toBe("המנוע");
  });

  it("treats empty input as no hashtag", () => {
    const parsed = parsePlayerForm(form({ hashtag: "#" }));
    expect(parsed.success && parsed.data.hashtag).toBeNull();
  });

  it("rejects spaces inside the hashtag", () => {
    expect(parsePlayerForm(form({ hashtag: "אין כניסה" })).success).toBe(false);
  });

  it("is optional when the field is missing", () => {
    const parsed = parsePlayerForm(form({}));
    expect(parsed.success).toBe(true);
  });
});

describe("parsePlayerForm isActive", () => {
  it("treats an unchecked checkbox (missing field) as inactive", () => {
    const fd = form({});
    fd.delete("isActive");
    const parsed = parsePlayerForm(fd);
    expect(parsed.success && parsed.data.isActive).toBe(false);
  });
});
