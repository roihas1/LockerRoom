/**
 * Fails when user-facing UI text contains Latin words outside the allowlist.
 * Scans JSX text, user-facing attributes, metadata title/description, and src/config/strings.ts.
 * Add `hebrew-ignore` in a comment on the same line to skip a deliberate exception.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { findForbiddenLatin } from "../src/config/hebrew-allowlist";

const root = join(import.meta.dirname, "..");
const scanDirs = ["src/app", "src/components"];
const stringsFiles = ["src/config/strings.ts", "src/config/labels.ts"];
const uiAttributes = new Set(["aria-label", "placeholder", "title", "alt", "label", "aria-description"]);
const metadataKeys = new Set(["title", "description", "absolute", "default", "template"]);

interface Violation {
  file: string;
  line: number;
  text: string;
  words: string[];
}

const violations: Violation[] = [];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|mts)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function report(sf: ts.SourceFile, node: ts.Node, text: string) {
  const words = findForbiddenLatin(text);
  if (words.length === 0) return;
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  const lineText = sf.text.split("\n")[line] ?? "";
  if (lineText.includes("hebrew-ignore")) return;
  violations.push({ file: relative(root, sf.fileName), line: line + 1, text: text.trim().slice(0, 80), words });
}

function literalText(node: ts.Node | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(" ");
  }
  if (ts.isJsxExpression(node)) return literalText(node.expression);
  if (ts.isConditionalExpression(node)) {
    return [literalText(node.whenTrue), literalText(node.whenFalse)].filter(Boolean).join(" ");
  }
  return null;
}

function scanUiFile(path: string) {
  const sf = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const isAppFile = path.includes(`${join("src", "app")}`);

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const text = node.getText(sf);
      if (text.trim()) report(sf, node, text);
    } else if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf);
      if (uiAttributes.has(name)) {
        const text = literalText(node.initializer);
        if (text) report(sf, node, text);
      }
    } else if (ts.isJsxExpression(node) && node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      const text = literalText(node.expression);
      if (text) report(sf, node, text);
    } else if (isAppFile && ts.isPropertyAssignment(node) && metadataKeys.has(node.name.getText(sf))) {
      const text = literalText(node.initializer);
      if (text) report(sf, node, text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function scanStringsFile(path: string) {
  const sf = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node)) {
      const text = literalText(node.initializer);
      if (text) report(sf, node, text);
    }
    if (ts.isArrowFunction(node)) {
      const text = literalText(node.body);
      if (text) report(sf, node, text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

for (const dir of scanDirs) {
  for (const file of walk(join(root, dir))) scanUiFile(file);
}
for (const file of stringsFiles) scanStringsFile(join(root, file));

if (violations.length > 0) {
  console.error(`check:hebrew found ${violations.length} non-Hebrew UI string(s):\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.words.join(", ")}]  "${v.text}"`);
  }
  console.error("\nTranslate the text to Hebrew, or add a genuine technical term to src/config/hebrew-allowlist.ts.");
  process.exit(1);
}
console.log("check:hebrew passed: all UI text is Hebrew.");
