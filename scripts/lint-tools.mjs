// A skill names only MCP tools the Xee server has. A tool that was renamed or never existed would
// send an agent into a call that fails. Run: node scripts/lint-tools.mjs
import { readFileSync } from "node:fs";
import { skillFiles, rel, list, finish } from "./shared.mjs";

const known = new Set(list("xee-mcp-tools.txt"));
const verbs = /^(list|get|push|create|sync|edit|propose|set)_[a-z_]+$/;
const problems = [];
const used = new Set();

for (const f of skillFiles()) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(/`([a-z][a-z_]*)`/g)) {
    const name = m[1];
    if (!verbs.test(name)) continue;
    // `get_doc` style names only; ignore Swift or JSON identifiers that merely look similar.
    if (known.has(name)) used.add(name);
    else problems.push(`${rel(f)}: \`${name}\` is not a tool of the Xee MCP`);
  }
}
for (const tool of known) if (!used.has(tool)) console.warn(`note: no skill mentions \`${tool}\``);
finish("tools", problems);
