#!/usr/bin/env node
/**
 * Deploy ibba-sync to Supabase (needs `supabase login` or SUPABASE_ACCESS_TOKEN).
 * Usage: node scripts/deploy-ibba.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "supabase", "functions");
const payload = {
  name: "ibba-sync",
  entrypoint_path: "ibba-sync/index.ts",
  verify_jwt: false,
  files: [
    { name: "ibba-sync/index.ts", content: fs.readFileSync(path.join(root, "ibba-sync/index.ts"), "utf8") },
    { name: "_shared/ibba-api.ts", content: fs.readFileSync(path.join(root, "_shared/ibba-api.ts"), "utf8") },
    { name: "_shared/ibba-diff.ts", content: fs.readFileSync(path.join(root, "_shared/ibba-diff.ts"), "utf8") },
  ],
};

fs.writeFileSync(path.join(__dirname, ".ibba-deploy-payload.json"), JSON.stringify({ project_id: "jmpgfgqmgagqgihhjgap", ...payload }));

const bundlePath = path.join(root, "ibba-sync", "index.bundle.mjs");
if (fs.existsSync(bundlePath)) {
  const content = fs.readFileSync(bundlePath, "utf8");
  const single = {
    project_id: "jmpgfgqmgagqgihhjgap",
    name: "ibba-sync",
    entrypoint_path: "ibba-sync/index.ts",
    verify_jwt: false,
    files: [{ name: "ibba-sync/index.ts", content }],
  };
  fs.writeFileSync(path.join(__dirname, ".ibba-deploy-single.json"), JSON.stringify(single));
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = "jmpgfgqmgagqgihhjgap";
if (!token) {
  console.error("Set SUPABASE_ACCESS_TOKEN or run: supabase login");
  console.error("Payload refreshed at scripts/.ibba-deploy-payload.json — deploy via Supabase MCP or CLI.");
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/functions/deploy`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
const text = await res.text();
console.log(res.status, text);
process.exit(res.ok ? 0 : 1);
