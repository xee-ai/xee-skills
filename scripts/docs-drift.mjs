// What changed in the SDK since the docs were last checked, and which pages mention it.
//
//   node scripts/docs-drift.mjs           print the report (exit 0)
//   node scripts/docs-drift.mjs --mark    record the SDK's current commit as verified (once the docs are up to date)
//
// The SDK checkout is XEE_SDK_DIR, or ../XeeSDK-iOS. The last verified commit is docs/sdk-sync.json.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DOCS, ROOT, rel, sdkDir } from "./shared.mjs";

const syncFile = join(ROOT, "docs", "sdk-sync.json");
const sync = JSON.parse(readFileSync(syncFile, "utf8"));
const sdk = sdkDir();
const git = (...args) => execFileSync("git", ["-C", sdk, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

let head;
try { head = git("rev-parse", "HEAD"); } catch { console.error(`drift: ${sdk} is not a git checkout. Set XEE_SDK_DIR.`); process.exit(2); }

if (process.argv.includes("--mark")) {
  const dirty = git("status", "--porcelain", "--", "Sources", "Sources.Logger", "DocSnippets");
  if (dirty) { console.error("drift: the SDK has uncommitted changes in Sources or DocSnippets. Commit them first, so the recorded commit is what you checked."); process.exit(1); }
  sync.verifiedSdkCommit = head;
  writeFileSync(syncFile, JSON.stringify(sync, null, 2) + "\n");
  console.log(`drift: docs recorded as checked against SDK ${head.slice(0, 10)}`);
  process.exit(0);
}

const since = sync.verifiedSdkCommit;
if (!since) { console.log("drift: no verified SDK commit recorded yet. Check the docs, then run with --mark."); process.exit(0); }
try { git("cat-file", "-e", `${since}^{commit}`); } catch { console.log(`drift: the verified commit ${since.slice(0, 10)} is not in this checkout (fetch more history).`); process.exit(0); }

const paths = ["Sources", "Sources.Logger", "DocSnippets"];
const files = git("diff", "--name-only", `${since}..HEAD`, "--", ...paths).split("\n").filter(Boolean);
const dirty = git("status", "--porcelain", "--", ...paths);
if (!files.length && !dirty) { console.log(`drift: none. The SDK is unchanged since ${since.slice(0, 10)}.`); process.exit(0); }

// Names declared on a changed line, in either direction (added, removed, renamed).
const diff = git("diff", "-U0", since, "--", ...paths);
const names = new Set();
for (const line of diff.split("\n")) {
  if (!/^[+-](?![+-])/.test(line)) continue;
  for (const m of line.matchAll(/\b(?:func|var|let|case|struct|enum|class|protocol|typealias)\s+`?([A-Za-z_]\w{2,})/g)) names.add(m[1]);
  for (const m of line.matchAll(/\bfunc with\(\s*([A-Za-z_]\w*)/g)) names.add(m[1]);
}

const pages = readdirSync(DOCS).filter((f) => f.endsWith(".md")).map((f) => [f, readFileSync(join(DOCS, f), "utf8")]);
const hits = new Map();
for (const n of names) {
  const where = pages.filter(([, t]) => new RegExp(`\\b${n}\\b`).test(t)).map(([f]) => f);
  if (where.length) hits.set(n, where);
}

console.log(`drift: ${files.length} SDK file(s) changed since ${since.slice(0, 10)}${dirty ? " (plus uncommitted changes)" : ""}:`);
for (const f of files) console.log(`  ${f}`);
if (hits.size) {
  console.log("\nNames on changed lines that the docs mention (check these pages):");
  for (const [n, where] of hits) console.log(`  ${n}  ->  ${where.join(", ")}`);
} else {
  console.log("\nNo page mentions a name on a changed line. Behaviour can still have changed: read the diff.");
}
console.log(`\nWhen the docs are up to date: node scripts/docs-drift.mjs --mark   (${rel(syncFile)})`);
