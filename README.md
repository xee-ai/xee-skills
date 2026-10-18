# Xee Skills

Skills that hand your iOS app's subscription work to the agent you already have open: add the Xee SDK, get the first sandbox purchase through, find out why a purchase does not unlock access, turn a paywall into testable values and read test results, and answer questions from Xee's docs.

**Everything about using them — what each skill does, what you can ask, what runs on your machine — is in the [plugin README](plugin/README.md).**

## Install

**Claude Code**

```bash
claude plugin marketplace add xee-ai/xee-skills
claude plugin install xee-skills@xee
```

**Codex**

```bash
codex plugin marketplace add xee-ai/xee-skills
codex plugin add xee-skills@xee
```

**Any agentic CLI**, through the [skills CLI](https://skills.sh):

```bash
npx skills add xee-ai/xee-skills --all
```

Other routes, including copying the skill directories by hand, are in the [plugin README](plugin/README.md#install).

## What is where

| Path | What it is |
| --- | --- |
| `plugin/` | The plugin users install: manifests for Claude Code and Codex, the skills, the logo, its README |
| `.claude-plugin/marketplace.json` | The marketplace that `marketplace add` reads |
| `plugin/skills/xee-docs/docs/` | The Xee docs: `nav.json` and one Markdown page per topic. The dashboard's `/docs` reads them from here |
| `scripts/`, `tests/`, `docs/`, `.github/` | Lints, test scenarios and maintainer notes. They do not ship |

## License and security

[MIT](LICENSE). Report a vulnerability privately as [SECURITY.md](SECURITY.md) describes.
