// The SDK names the docs mention exist in the SDK's source: `Xee.something`, `XeeSomeType`, and the
// labels of `.with(label:)`. A renamed or removed method then fails here instead of staying in a page.
// It reads declarations, not access levels, so a name that exists only internally still passes: the
// compiled snippets (scripts/sync-snippets.mjs) are the strict check for code; this one covers the
// prose and tables. Run: node scripts/lint-symbols.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DOCS, rel, sdkDir, finish, list } from "./shared.mjs";

const sdk = sdkDir();
const sources = ["Sources", "Sources.Logger"].map((d) => join(sdk, d)).filter(existsSync);
if (!sources.length) {
  console.error(`symbols: no SDK sources in ${sdk}. Set XEE_SDK_DIR to a checkout of the XeeSDK-iOS repository.`);
  process.exit(2);
}

const swift = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? swift(p) : p.endsWith(".swift") ? [p] : [];
  });

const declared = new Set();       // every func, var, let, case, type and typealias name
const withLabels = new Set();     // first labels of `with(...)` builder methods
for (const dir of sources) {
  for (const file of swift(dir)) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/\b(?:func|var|let|case|struct|enum|class|protocol|typealias|actor)\s+`?([A-Za-z_]\w*)/g)) declared.add(m[1]);
    // `case a, b, c` declares several names.
    for (const m of text.matchAll(/^\s*case\s+([A-Za-z_]\w*(?:\s*(?:=[^,\n]+)?,\s*[A-Za-z_]\w*)+)/gm))
      for (const n of m[1].split(",")) declared.add(n.trim().split(/[\s=(]/)[0]);
    for (const m of text.matchAll(/\bfunc with\(\s*([A-Za-z_]\w*)/g)) withLabels.add(m[1]);
  }
}

const allow = new Set(list("symbol-allowlist.txt"));
const problems = [];
const files = readdirSync(DOCS).filter((f) => f.endsWith(".md")).map((f) => join(DOCS, f));
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const note = (what) => problems.push(`${rel(file)}: ${what}`);
  for (const m of text.matchAll(/\bXee\.([a-zA-Z_]\w*)/g))
    if (!declared.has(m[1]) && !allow.has(`Xee.${m[1]}`)) note(`Xee.${m[1]} is not in the SDK`);
  // A file name (XeePaywalls.json) or the repository (XeeSDK-iOS) is not a symbol.
  for (const m of text.matchAll(/\b(Xee[A-Z]\w*)(\.json|-iOS)?/g))
    if (!m[2] && !declared.has(m[1]) && !allow.has(m[1])) note(`${m[1]} is not in the SDK`);
  for (const m of text.matchAll(/\.with\(\s*([A-Za-z_]\w*)\s*:/g))
    if (!withLabels.has(m[1]) && !allow.has(`with(${m[1]}:`)) note(`.with(${m[1]}:) is not a builder method of the SDK`);
}
finish(`symbols (${declared.size} SDK names)`, [...new Set(problems)]);
