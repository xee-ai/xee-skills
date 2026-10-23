// No file carries a credential or a path from someone's machine. Skills are published, so a token
// pasted into an example would be public. Run: node scripts/lint-secrets.mjs
import { readFileSync } from "node:fs";
import { walk, rel, finish } from "./shared.mjs";

const rules = [
  [/xee_pat_[A-Za-z0-9]{12,}/, "a Xee personal access token"],
  [/Bearer\s+(?!YOUR_TOKEN\b)[A-Za-z0-9._~+/-]{24,}/, "a bearer token"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
  [/\/Users\/[A-Za-z][\w.-]*\//, "a path from someone's machine"],
  [/\b(?:127\.0\.0\.1|localhost):\d{4,5}\b/, "a local server address (use a placeholder)"],
];
const skip = /\.(png|jpg|svg)$|lint-secrets\.mjs$/;
const problems = [];
for (const f of walk()) {
  if (skip.test(f)) continue;
  const text = readFileSync(f, "utf8");
  for (const [re, what] of rules) if (re.test(text)) problems.push(`${rel(f)}: contains ${what}`);
}
finish("secrets", problems);
