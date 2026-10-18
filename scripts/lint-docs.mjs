// The docs are consistent: every page the nav names has a file, every file is in the nav, and no page
// is empty. The dashboard and the MCP both read the nav, so a mismatch shows as a missing page there.
// Run: node scripts/lint-docs.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DOCS, docPages, rel, finish } from "./shared.mjs";

const problems = [];
const pages = docPages();
const files = new Set(readdirSync(DOCS).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)));
const seen = new Set();

for (const p of pages) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) problems.push(`nav: slug "${p.slug}" must be lowercase words joined by hyphens`);
  if (seen.has(p.slug)) problems.push(`nav: slug "${p.slug}" appears twice`);
  seen.add(p.slug);
  if (!p.title || !p.nav) problems.push(`nav: "${p.slug}" needs a title and a nav label`);
  if (!files.has(p.slug)) problems.push(`nav: "${p.slug}" has no file docs/${p.slug}.md`);
}
for (const f of files) {
  if (!seen.has(f)) problems.push(`${rel(join(DOCS, f + ".md"))}: not in nav.json, so nobody can reach it`);
  const text = readFileSync(join(DOCS, f + ".md"), "utf8");
  if (!text.trim()) problems.push(`${rel(join(DOCS, f + ".md"))}: empty`);
  if (/^# /m.test(text)) problems.push(`${rel(join(DOCS, f + ".md"))}: has a "# " heading; the title comes from nav.json`);
  for (const m of text.matchAll(/\{\{(\w+)\}\}/g))
    if (!["server", "sdk_repo"].includes(m[1])) problems.push(`${rel(join(DOCS, f + ".md"))}: unknown placeholder {{${m[1]}}}`);
}
finish("docs", problems);
