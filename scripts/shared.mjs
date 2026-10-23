// Helpers shared by the lints. No dependencies: Node 18 or later.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SKILLS = join(ROOT, "plugin", "skills");

/** Every file under `dir`, skipping what is never published. CI checks the SDK out into `sdk/`. */
export function walk(dir = ROOT) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if ([".git", "node_modules", ".DS_Store"].includes(name)) continue;
    const p = join(dir, name);
    if (p === join(ROOT, "sdk")) continue;
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

export const rel = (p) => relative(ROOT, p);

/** The skills: [{ dir, name, file, text }]. */
export function skills() {
  return readdirSync(SKILLS)
    .filter((n) => existsSync(join(SKILLS, n, "SKILL.md")))
    .map((n) => {
      const file = join(SKILLS, n, "SKILL.md");
      return { dir: n, file, text: readFileSync(file, "utf8") };
    });
}

/** The skill's files that an agent reads: SKILL.md and its references. */
export function skillFiles() {
  return walk(SKILLS).filter((f) => f.endsWith(".md"));
}

/**
 * The SDK repository checkout: XEE_SDK_DIR, or the first of ../xee-sdk/ios and ../XeeSDK-iOS that exists
 * next to this repository.
 */
export const sdkDir = () => {
  if (process.env.XEE_SDK_DIR) return resolve(process.env.XEE_SDK_DIR);
  const candidates = [join(ROOT, "..", "xee-sdk", "ios"), join(ROOT, "..", "XeeSDK-iOS")];
  return resolve(candidates.find((c) => existsSync(join(c, "DocSnippets"))) ?? candidates[0]);
};

/** The docs: the xee-docs skill's `docs/` folder, arranged by its nav.json. */
export const DOCS = join(SKILLS, "xee-docs", "docs");

/** Every page the docs nav names, as { slug, section, title }. */
export function docPages() {
  const nav = JSON.parse(readFileSync(join(DOCS, "nav.json"), "utf8"));
  return nav.flatMap((s) => s.pages.map((p) => ({ ...p, section: s.section })));
}

export const docSlugs = () => docPages().map((p) => p.slug);

/** A list file: one entry per line, `#` comments and blanks ignored. */
export function list(name) {
  return readFileSync(join(ROOT, "scripts", name), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

/** Prints the problems and exits non-zero if there are any. */
export function finish(title, problems) {
  if (problems.length) {
    console.error(`${title}: ${problems.length} problem(s)`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`${title}: ok`);
}
