/**
 * Fails when physical left/right Tailwind utilities are used. Use logical ones instead
 * (ms/me, ps/pe, start/end, text-start/text-end, rounded-s/e, border-s/e).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const physical =
  /(?<![\w-])(?:-?(?:ml|mr|pl|pr|left|right|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-[\w[.]|(?:text|float|clear)-(?:left|right)\b|(?:rounded|border)-(?:l|r|tl|tr|bl|br)(?:-|\b)|space-x-reverse)/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : /\.(tsx?|css)$/.test(entry) ? [full] : [];
  });
}

const hits: string[] = [];
for (const file of walk(join(root, "src"))) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (line.includes("rtl-ignore")) return;
      const classChunks = line.match(/(?:className|cn\(|cva\()[^\n]*/g);
      if (!classChunks) return;
      for (const chunk of classChunks) {
        const m = chunk.match(physical);
        if (m) hits.push(`  ${relative(root, file)}:${i + 1}  "${m[0]}"`);
      }
    });
}

if (hits.length) {
  console.error(`check:rtl found ${hits.length} physical direction utilit(ies):\n${hits.join("\n")}`);
  process.exit(1);
}
console.log("check:rtl passed: only logical direction utilities are used.");
