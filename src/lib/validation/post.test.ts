import { describe, expect, it } from "vitest";
import { parsePostForm } from "./post";

const form = (fields: Record<string, string> = {}) => {
  const fd = new FormData();
  fd.set("type", "announcement");
  fd.set("title", "הודעה");
  fd.set("body", "תוכן");
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe("parsePostForm isPinned", () => {
  it("treats an unchecked checkbox (missing field) as not pinned", () => {
    const parsed = parsePostForm(form({}));
    expect(parsed.success && parsed.data.isPinned).toBe(false);
  });

  it("accepts a checked pin", () => {
    const parsed = parsePostForm(form({ isPinned: "on" }));
    expect(parsed.success && parsed.data.isPinned).toBe(true);
  });
});
