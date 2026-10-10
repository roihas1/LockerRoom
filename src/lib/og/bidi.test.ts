import { describe, expect, it } from "vitest";
import { stripEmoji, toVisualRtl, wrapLines } from "./bidi";

describe("toVisualRtl", () => {
  it("reverses a pure Hebrew string", () => {
    expect(toVisualRtl("שלום")).toBe("םולש");
  });

  it("reverses word order and keeps numbers readable", () => {
    expect(toVisualRtl("ניצחון 82:74")).toBe("82:74 ןוחצינ");
  });

  it("keeps Latin runs in order", () => {
    expect(toVisualRtl("נגד Opp 1")).toBe("Opp 1 דגנ");
  });

  it("mirrors brackets inside RTL text", () => {
    expect(toVisualRtl("שחקן (קפטן)")).toBe("(ןטפק) ןקחש");
  });

  it("leaves pure LTR text alone", () => {
    expect(toVisualRtl("82:74")).toBe("82:74");
  });
});

describe("wrapLines", () => {
  it("wraps by words and truncates extra lines", () => {
    expect(wrapLines("אחת שתיים שלוש ארבע", 9, 5)).toEqual(["אחת שתיים", "שלוש ארבע"]);
    expect(wrapLines("אחת שתיים שלוש ארבע חמש", 9, 2)).toEqual(["אחת שתיים", "שלוש…"]);
  });
});

describe("stripEmoji", () => {
  it("removes emoji and tidies spaces", () => {
    expect(stripEmoji("🏀 ניצחון 🎉 גדול")).toBe("ניצחון גדול");
  });
});
