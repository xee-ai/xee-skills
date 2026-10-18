// Copies the compiled code samples of the SDK repo (XeeSDK-iOS/DocSnippets) into the docs pages.
//
//   node scripts/sync-snippets.mjs           rewrite every page's marked code blocks from the SDK
//   node scripts/sync-snippets.mjs --check   change nothing; exit 1 if a page is out of date (CI)
//
// The SDK's folder is XEE_SDK_DIR, or ../xee-sdk/ios (else ../XeeSDK-iOS) next to this repository. A page marks a block with
// ```swift title="SwiftUI" snippet="activate-quick"; the block's text is then the snippet, never hand-edited.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { DOCS, rel, sdkDir } from "./shared.mjs";

const check = process.argv.includes("--check");
const sdk = sdkDir();
const snippetsDir = join(sdk, "DocSnippets", "Snippets");
if (!existsSync(snippetsDir)) {
  console.error(`snippets: no ${snippetsDir}. Set XEE_SDK_DIR to a checkout of the XeeSDK-iOS repository.`);
  process.exit(2);
}

/** The placeholder a page uses for the reader's own server; the snippets write a real-looking URL so they compile. */
const SERVER_LITERAL = "https://xee.example.test";

function swiftFiles(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? swiftFiles(p) : p.endsWith(".swift") ? [p] : [];
  });
}

/** { id: text } from every `// snippet: id` ... `// end snippet` region. */
function readSnippets() {
  const found = {};
  const problems = [];
  for (const file of swiftFiles(snippetsDir)) {
    const lines = readFileSync(file, "utf8").split("\n");
    let id = null, body = [];
    lines.forEach((line, i) => {
      const start = /^\s*\/\/ snippet: ([a-z0-9-]+)\s*$/.exec(line);
      if (start) {
        if (id) problems.push(`${file}:${i + 1}: snippet "${start[1]}" starts inside "${id}"`);
        id = start[1]; body = [];
      } else if (/^\s*\/\/ end snippet\s*$/.test(line)) {
        if (!id) { problems.push(`${file}:${i + 1}: "end snippet" with no start`); return; }
        if (id in found) problems.push(`${file}:${i + 1}: snippet "${id}" is defined twice`);
        found[id] = format(body);
        id = null;
      } else if (id) body.push(line);
    });
    if (id) problems.push(`${file}: snippet "${id}" has no "// end snippet"`);
  }
  return { found, problems };
}

/** The region as it appears in a page: hidden lines out, dedented, no blank edges, the server as a placeholder. */
function format(lines) {
  const kept = lines.filter((l) => !/\/\/ docs:hide\s*$/.test(l));
  const indent = Math.min(...kept.filter((l) => l.trim()).map((l) => /^ */.exec(l)[0].length), Infinity);
  const dedented = kept.map((l) => (l.trim() ? l.slice(indent === Infinity ? 0 : indent) : ""));
  while (dedented.length && !dedented[0]) dedented.shift();
  while (dedented.length && !dedented[dedented.length - 1]) dedented.pop();
  return dedented.join("\n").replaceAll(SERVER_LITERAL, "{{server}}");
}

const { found, problems } = readSnippets();
const used = new Set();
const stale = [];

for (const name of readdirSync(DOCS).filter((f) => f.endsWith(".md"))) {
  const file = join(DOCS, name);
  const text = readFileSync(file, "utf8");
  // The body may be empty, so the closing fence is "\n```" or, for an empty block, "```" straight after the opening line.
  const out = text.replace(/^(```\w*[^\n]*?\bsnippet="([a-z0-9-]+)"[^\n]*\n)((?:(?!```)[^\n]*\n)*?)(?<=\n|^)```$/gm, (all, open, id) => {
    if (!(id in found)) {
      problems.push(`${rel(file)}: snippet "${id}" is not in ${rel(snippetsDir)}`);
      return all;
    }
    used.add(id);
    return open + found[id] + "\n```";
  });
  if (out !== text) {
    stale.push(rel(file));
    if (!check) writeFileSync(file, out);
  }
}

for (const id of Object.keys(found)) if (!used.has(id)) console.warn(`note: snippet "${id}" is not used by any page`);
if (problems.length) {
  console.error(`snippets: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
if (stale.length && check) {
  console.error(`snippets: ${stale.length} page(s) differ from the SDK's compiled samples. Run: node scripts/sync-snippets.mjs`);
  for (const f of stale) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(stale.length ? `snippets: updated ${stale.join(", ")}` : `snippets: ok (${used.size} in use, ${Object.keys(found).length} defined)`);
