// Every SKILL.md has the frontmatter the skill format asks for: a name that matches its folder,
// and a description that says when to use the skill. Run: node scripts/lint-frontmatter.mjs
import { skills, rel, finish } from "./shared.mjs";

const problems = [];

/** The frontmatter block as { key: value }. Reads `key: text`, and `key: >-` or `|` with indented lines. */
function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return null;
  const fm = {};
  const lines = m[1].split("\n");
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let value = kv[2];
    if (/^[>|][+-]?$/.test(value)) {
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      value = parts.join(" ");
    }
    fm[kv[1]] = value.replace(/^(["'])(.*)\1$/, "$2");
  }
  return fm;
}

for (const s of skills()) {
  const where = rel(s.file);
  const fm = frontmatter(s.text);
  if (!fm) { problems.push(`${where}: no frontmatter`); continue; }
  if (fm.name !== s.dir) problems.push(`${where}: name "${fm.name}" must equal the folder "${s.dir}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name ?? "") || (fm.name ?? "").length > 64)
    problems.push(`${where}: name must be lowercase letters, digits and hyphens, up to 64 characters`);
  const d = fm.description ?? "";
  if (!d) problems.push(`${where}: no description`);
  else {
    if (d.length > 1024) problems.push(`${where}: description is ${d.length} characters; the limit is 1024`);
    if (!d.startsWith("Use when")) problems.push(`${where}: the description should start with "Use when"`);
  }
  for (const key of Object.keys(fm)) {
    if (!["name", "description", "license", "allowed-tools", "metadata", "compatibility"].includes(key))
      problems.push(`${where}: unknown frontmatter key "${key}"`);
  }
}
finish("frontmatter", problems);
