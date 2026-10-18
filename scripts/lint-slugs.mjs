// Every docs page a skill links or fetches exists in the Xee docs. A wrong slug returns an error to
// the agent instead of the page. Run: node scripts/lint-slugs.mjs
import { readFileSync } from "node:fs";
import { skillFiles, rel, docSlugs, finish } from "./shared.mjs";

const known = new Set(docSlugs());
const problems = [];

for (const f of skillFiles()) {
  const text = readFileSync(f, "utf8");
  // A link such as /docs/identify-users or /docs/md/identify-users.
  for (const m of text.matchAll(/\/docs\/(?:md\/)?([a-z0-9-]+)/g)) if (m[1] !== "md")
    if (!known.has(m[1])) problems.push(`${rel(f)}: /docs/${m[1]} is not a page of the Xee docs`);
  // A table row that starts with a page's slug in backticks, as in xee-docs.
  for (const m of text.matchAll(/^\|[^|\n]*\|\s*`([a-z0-9-]+)`\s*\|/gm))
    if (m[1].includes("-") && !known.has(m[1]) && !/^(xee|paywall|purchase)-/.test(m[1]))
      problems.push(`${rel(f)}: \`${m[1]}\` looks like a docs slug but is not a page of the Xee docs`);
}
finish("slugs", problems);
