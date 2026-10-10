/**
 * Minimal bidi reordering for generated images. The image renderer (satori) lays text out left to right
 * only, so Hebrew must be converted to visual order first: strong RTL runs are reversed, Latin/number runs
 * keep their order, and the run order is flipped for a right-to-left paragraph.
 */

type Dir = "R" | "L" | "N";

const RTL = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
const LTR = /[A-Za-z0-9\u00C0-\u024F]/;
const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "«": "»", "»": "«" };

function strongDir(ch: string): Dir {
  if (RTL.test(ch)) return "R";
  if (LTR.test(ch)) return "L";
  return "N";
}

export function toVisualRtl(text: string): string {
  const chars = Array.from(text);
  const dirs = chars.map(strongDir);

  // Neutrals between two LTR characters (":" in "82:74", the space in "Opp 1") join the LTR run;
  // every other neutral follows the right-to-left paragraph direction.
  const resolved = dirs.map((d, i) => {
    if (d !== "N") return d;
    let prev: Dir = "R";
    for (let j = i - 1; j >= 0; j--) if (dirs[j] !== "N") { prev = dirs[j]!; break; }
    let next: Dir = "R";
    for (let j = i + 1; j < dirs.length; j++) if (dirs[j] !== "N") { next = dirs[j]!; break; }
    return prev === "L" && next === "L" ? "L" : "R";
  });

  const runs: { dir: Dir; chars: string[] }[] = [];
  chars.forEach((ch, i) => {
    const dir = resolved[i]!;
    const last = runs.at(-1);
    if (last && last.dir === dir) last.chars.push(ch);
    else runs.push({ dir, chars: [ch] });
  });

  return runs
    .reverse()
    .map((run) => (run.dir === "R" ? run.chars.reverse().map((c) => MIRROR[c] ?? c).join("") : run.chars.join("")))
    .join("");
}

/** Greedy word wrap in logical order, so each visual line can be reordered on its own. */
export function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]!.replace(/\s*\S*$/, "")}…`;
    return kept;
  }
  return lines;
}

/** Emoji need a remote font in the image renderer; strip them so text never renders as boxes. */
export function stripEmoji(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
