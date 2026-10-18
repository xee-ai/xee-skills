# Maintaining the skills

## When the Xee server changes

The skills depend on two things the Xee server owns. Keep these files in step with it.

**MCP tools.** `scripts/xee-mcp-tools.txt` lists the tools in the server's `tools()` function (`server/src/mcp.rs`). When a tool is added, renamed or removed:

1. Update the list.
2. Run `node scripts/lint-tools.mjs`. It names every skill line that mentions a tool that no longer exists.
3. If a tool is new, decide which skill owns it and add it there.

**Docs pages.** The pages are this repository's, in `plugin/skills/xee-docs/docs/` (`nav.json` and one `<slug>.md` per page). The dashboard reads them from GitHub (`DOCS_SOURCE_URL`, by default this repository's `main` branch), and the Xee MCP serves the same files through `list_docs` and `get_doc`, so editing a page here is the only step. When a page is added, renamed or removed:

1. Change `nav.json` and the file together.
2. Run `node scripts/lint-docs.mjs` (the nav and the files agree) and `node scripts/lint-slugs.mjs` (no skill links a page that is gone).
3. Update the routing table in `plugin/skills/xee-docs/SKILL.md`, and the stage table in `xee-integration` if the page is one of its stages.
4. Push to `main`. The dashboard shows it after GitHub's file server refreshes its copy (it caches each file for 5 minutes) and the dashboard's own one-minute cache: allow up to about 6 minutes. Seeing the old page right after a push is normal. The Xee server shows it at once if its `DOCS_SOURCE_URL` is set to the same folder; otherwise on its next build, which embeds a snapshot of these files.

A page is Markdown in the small subset the dashboard renders (`##` and `###` headings, lists, tables, fenced code, `> [!TIP]` callouts). It has no `# ` title: the title comes from `nav.json`. It may use `{{server}}` and `{{sdk_repo}}`, which the dashboard and the MCP fill in.

## When the SDK changes

Docs go stale when the SDK changes and nobody remembers the pages. Four things stop that, from the strictest to the most helpful:

1. **The code samples are compiled.** Every Swift block in a page carries `snippet="<id>"` and is a copy of a region in the SDK repository's `DocSnippets/Snippets/*.swift`. That folder is a package that builds against the SDK (`xcodebuild -scheme XeeDocSnippets -destination 'generic/platform=iOS' build`, run by the SDK's `doc-snippets` workflow), so a change that breaks a sample fails the SDK's build until the sample is fixed. `node scripts/sync-snippets.mjs` copies the samples into the pages; `--check` fails when a page differs.
2. **Names are checked.** `node scripts/lint-symbols.mjs` reads the SDK's source and fails when a page mentions `Xee.something`, an `XeeType` or a `.with(label:)` that does not exist. It covers prose and tables, which the samples do not.
3. **The docs repository checks itself against the SDK** on every pull request, every day at 06:17 UTC, and when the SDK repository sends `sdk-changed` (its `docs-notify` workflow does so when a pull request changes `Sources/`, if the secret `DOCS_REPO_TOKEN` is set). A failure opens one issue, "Docs have drifted from the SDK", and adds a comment on each later failure.
4. **Your agent does the rewrite.** In Claude Code, run `/sync-docs` in this repository. It lists what changed in the SDK since the last check (`node scripts/docs-drift.mjs`), fixes the samples, then the prose, runs the checks, and records the SDK commit in `docs/sdk-sync.json` with `node scripts/docs-drift.mjs --mark`.

None of these can see a change in behaviour that keeps the same names, such as a different default. The pull request template and the `docs-notify` comment on the SDK repository are there to prompt a human read for that.

To run the SDK-reading checks locally, keep a checkout of the SDK at `../XeeSDK-iOS`, or set `XEE_SDK_DIR`.

### Setting it up on GitHub

- In `xee-ai/XeeSDK-iOS`: the `doc-snippets` and `docs-notify` workflows and the pull request template are in its `.github/`. For the signal to reach this repository, add a secret `DOCS_REPO_TOKEN`: a fine-grained token with write access to this repository's contents. Without it the checklist comment still appears.
- In `xee-ai/xee-skills`: the `skill-lints` workflow checks out the SDK repository, so the SDK repository must be readable by the workflow (public, or give the token access).

## Adding a skill

1. Make `plugin/skills/<name>/SKILL.md` with `name` equal to the folder and a description that starts "Use when".
2. Add it to the toolkit table in `plugin/README.md`, the list in `CLAUDE.md`, and the skills named in the other skills' descriptions that should hand over to it.
3. If it writes to Xee or to the person's project, add its confirmations to "How it keeps you safe" and its calls to "What the skills run, fetch and send" in the plugin README.
4. Run all five lints and `claude plugin validate plugin`.

## Releasing

1. Bump `version` in both `plugin/.claude-plugin/plugin.json` and `plugin/.codex-plugin/plugin.json`.
2. Run the checks in `CLAUDE.md` and the scenarios in `tests/README.md`.
3. Tag the release. Claude Code and Codex pick it up on the next plugin update; `npx skills update` does the same for skills installed through the skills CLI.
