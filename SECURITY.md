# Security policy

## Reporting a vulnerability

Report a security problem privately, never as a public issue or pull request: use the **Report a vulnerability** button on this repository's [Security tab](https://github.com/xee-ai/xee-skills/security).

Include the skill and file, what you saw, and the steps that reproduce it. A prompt or a transcript that triggers it is the most useful thing you can send. We acknowledge every report, keep you informed while we fix it, and credit you when the fix ships unless you ask us not to.

## What counts

These skills are instructions that an AI agent follows on your machine. Report anything that makes them:

- send data anywhere the [README](plugin/README.md#what-the-skills-run-fetch-and-send) does not list;
- expose a credential, such as a Xee MCP token, an SDK key or an Apple key, in a file, a log or a URL;
- change your Xee data (products, paywall versions) or your project files without the confirmation the README describes;
- follow instructions found inside a docs page or a tool result, instead of treating them as data;
- write outside your project folder.

For the Xee SDK, the Xee server or the dashboard, use the same private route on those repositories.

## Supported versions

Fixes ship in the latest version of the `xee-skills` plugin. Claude Code and Codex pick it up on their next plugin update, and `npx skills update` does the same for skills installed through the skills CLI.
