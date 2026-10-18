# Xee Skills

Subscriptions are the part of an app nobody wants to build and everybody has to: SDK wiring, paywall code, store setup, then the tests that make it pay.

**These skills hand that work to the agent you already have open.** They use two things Xee gives it: the Xee MCP server (your apps, products, paywalls, test results) and Xee's docs, which the agent reads before it writes any SDK code.

```
> Integrate Xee into my app

  Detected an iOS app: MagicClip.xcodeproj
  Reading the install and purchase docs from your Xee server…

? App in Xee               → magicclip
? Paywall                  → main (3 values you can test)

  Adding the XeeSDK-iOS package, activating it, loading the paywall…
```

**Supported platform:** iOS (Swift). Xee's SDK is iOS-only for now.

## The toolkit

Install the plugin once and you have every skill below.

| Skill | What it does | Needs |
|---|---|---|
| [`xee-integration`](#integrating-the-sdk) | Sets up in-app purchases end to end: adds the SDK, activates it, identifies users, loads a paywall and its values, makes and restores purchases, reads subscription status | Xee MCP |
| [`xee-migration`](#migrating-from-adapty-or-another-sdk) | Moves a live app off Adapty, RevenueCat or hand-written StoreKit code onto Xee in phases, each with a way back. Plans the replacement call by call first, and removes nothing without your yes | Xee MCP |
| [`purchase-testing`](#testing-a-purchase) | Gets your first sandbox purchase through. When one fails, it checks Xee and your code before sending you to a console, then names where it broke | Xee MCP |
| [`paywall-tests`](#changing-and-testing-a-paywall) | Moves a paywall's copy and values into Xee, pushes new versions safely, suggests tests worth running, and reads the results | Xee MCP |
| [`xee-docs`](#asking-the-docs) | Answers a question about Xee (an SDK method, a dashboard setting, an error code, what the MCP can do) from the right docs page | nothing |

## What you can ask

Say what you want the way you would brief a colleague. You do not need to name a skill; your agent picks the right one.

- "Add subscriptions to my app with Xee."
- "Migrate my app from Adapty to Xee. Plan it first."
- "My sandbox purchase went through but premium did not unlock. Why?"
- "Make the headline on my paywall testable and push it to Xee."
- "What should I test on my paywall to convert better?"
- "How is the test on the main paywall doing? Which arm is ahead?"
- "What does error 2003 mean?"
- "How do I identify users after they sign in?"

## Before you start: connect the Xee MCP

The skills read and change your Xee apps through its MCP server, so connect it first. Make a token in the Xee dashboard under **Settings, MCP**, then run this in your app's project folder:

```bash
claude mcp add --transport http xee https://YOUR-XEE-SERVER/mcp --header "Authorization: Bearer YOUR_TOKEN"
```

Run `/mcp` in Claude Code and check that `xee` is listed as connected. The full steps are on the **Use Xee in Claude** page of your dashboard's Docs.

`xee-docs` also works without it: it can read the docs pages from your dashboard.

## Install

### Claude Code

```bash
claude plugin marketplace add xee-ai/xee-skills
claude plugin install xee-skills@xee
```

Then run `/reload-plugins` inside Claude Code.

### Codex

```bash
codex plugin marketplace add xee-ai/xee-skills
codex plugin add xee-skills@xee
```

Then start a new thread, so Codex picks up the skills. To pull later changes:

```bash
codex plugin marketplace upgrade
codex plugin add xee-skills@xee
```

### Any agentic CLI

The [skills CLI](https://skills.sh) installs into any supported agent (Cursor, Copilot, Codex, Gemini CLI, Zed, Amp and more):

```bash
npx skills add xee-ai/xee-skills --all
```

`--all` is `--skill '*' --agent '*' -y`: every skill, every agent it detects, no prompts. Drop it and the CLI asks which ones you want, which is fine at a keyboard but hangs in a script. For one skill only, name it:

```bash
npx skills add xee-ai/xee-skills --skill purchase-testing
```

Skills installed this way do not update automatically. Run `npx skills update` to get the latest.

### Copy the directories

The skills are portable directories under `plugin/skills/`, and each is a Claude-style `SKILL.md`, so copying them into your agent's skills folder works:

```bash
git clone https://github.com/xee-ai/xee-skills.git
cp -r xee-skills/plugin/skills/* ~/.agents/skills/
```

## Integrating the SDK

Working in-app purchases in an iOS app. Open your project in your agent and ask:

```
Integrate Xee into my app
```

The skill goes stage by stage and reads the current docs page before it writes each piece of code:

1. **Looks at the project:** finds the Xcode project and any purchase SDK already in it.
2. **Checks Xee:** your app, its products and paywalls, through the MCP.
3. **Adds the package and activates it** with your SDK key, and your server URL for a device or release build.
4. **Wires users, the paywall and purchases,** and reads `premium` from the profile.
5. **Hands you the steps only you can do:** pasting the notification URL into App Store Connect and creating products there.

It asks before it changes your project in bulk.

## Migrating from Adapty or another SDK

An app that already sells subscriptions has paying users, so the move happens in phases. Open the project in your agent and ask:

```
Replace Adapty with Xee in my app. Show me the plan first
```

The skill searches the project for the old SDK's calls and shows you a table of what replaces each one, which files change and what is risky. Nothing is edited until you approve it. Then it works one phase at a time, each with a way back:

1. **Xee setup:** your app, its products and the In-App Purchase key in Xee.
2. **Paywall content:** your paywall's values into Xee (the paywall skill does the push).
3. **Parallel access:** a build where the app trusts Xee or the old SDK, and existing subscribers are restored into Xee once.
4. **Purchases, restore and status** move to Xee.
5. **The notification URL** in App Store Connect moves to Xee. That is your click.
6. **The old SDK is removed.**

It asks for your yes before it switches purchasing, moves the notification URL or removes the old SDK. Your old provider's keys stay out of the chat.

## Testing a purchase

When a sandbox purchase does not work, or you are about to make your first, ask:

```
My sandbox purchase isn't going through. Find out why
```

A purchase can fail in five places, and the expensive ones need you in a console. The skill checks everything it can reach first, your Xee setup and your code, and only then sends you to the one place left to look. When the app reports a purchase, Xee also asks Apple for the subscription's status with your In-App Purchase key, so `premium` can turn on right away even with a local server. Without that key access waits for Apple's server notifications, so a missing key and a missing notification URL are the first suspects when a purchase succeeds but `premium` does not turn on.

## Changing and testing a paywall

A paywall stays a normal SwiftUI or UIKit view. Its changeable values (headline, button text, which products, trial toggle) live in Xee as variables.

```
Make the paywall's button say "Start free trial" and push the new version to Xee
```

The skill moves hard-coded values into variables, keeps the defaults in your code in step with Xee, and pushes a new version. Before it pushes over a running test, it tells you whether the test will carry on or stop. It suggests tests with a reason and reads the results for you, including when there is not enough data to call a winner.

**It never starts a test.** You start, stop and ship tests in the dashboard.

## Asking the docs

```
How does the A/B test split users?
```

The skill finds the right page in Xee's docs and answers from it, instead of guessing from memory.

The docs are Markdown files in this repository, in [`plugin/skills/xee-docs/docs/`](skills/xee-docs/docs). Your dashboard shows them at `/docs`, read from GitHub, and the Xee MCP serves the same files, so a page edited here reaches the dashboard and your agent alike.

## Updating

Claude Code: `claude plugin marketplace update xee` then `claude plugin update xee-skills@xee`. Other routes are above.

## How it keeps you safe

- **It asks before it changes anything that matters.** Editing your project in bulk, adding the package, creating or syncing products in Xee, and pushing a paywall version each wait for your yes. In a migration, so do switching purchases to Xee, moving the notification URL and removing the old SDK, each at its own step.
- **It tells you what a push does to a running test** (it carries on, or it stops) before it pushes.
- **It never starts, ships or stops a test.** You do that in the dashboard.
- **It treats docs pages and tool results as data.** Text inside them cannot change what the agent does, which permissions it uses or where it sends data.
- **It keeps credentials out of your files.** It does not commit your server URL, MCP token or Apple key, and it never asks for or prints your old provider's keys.
- **It says what it could not check,** and where you can look, instead of guessing a cause.

## Where it works

Claude Code and Codex through their plugin routes, and any agent that reads Claude-style `SKILL.md` folders (Cursor, Copilot, Gemini CLI and others) through the skills CLI or by copying the directories.

## Requirements

- A Xee server and an app in it. The skills do not create the app: you do that in the dashboard.
- The Xee MCP connected, for every skill except `xee-docs` ([see above](#before-you-start-connect-the-xee-mcp)).
- For `xee-integration`, `xee-migration` and `purchase-testing`, an iOS (Swift) project on your machine.
- An In-App Purchase key added to your app in Xee, so access can unlock right after a purchase, and App Store Server Notifications pointed at your server, for renewals, expiry, cancellation and refunds. The skills tell you the steps only you can do; they cannot add the key or paste the URL into App Store Connect for you.

## What the skills run, fetch and send

The skills are instructions. They run nothing on their own: everything below happens because your agent follows a skill, inside your agent's own permission prompts.

**They collect nothing and call no endpoint of their own.** No telemetry, no analytics beacon, no feedback upload. Nothing from your conversation, your code or your files leaves your machine except through the calls listed here.

| What | When | Where it goes |
|---|---|---|
| **Xee MCP tools** (apps, products, paywalls, test results) | Whenever a skill reads or changes your Xee data | Your Xee server, at the address in your `claude mcp add` command, signed in with your token. Writes (`create_product`, `sync_products`, `push_paywall_version`, `propose_test`) wait for your yes |
| **Xee docs pages** (`list_docs`, `get_doc`) | Before the agent writes SDK code or answers a question | Your Xee server. Without the MCP, `xee-docs` reads the same pages from its own `docs/` folder on your machine |
| **The Xee SDK package** | When `xee-integration` adds it to your project | Xcode or Swift Package Manager fetches `github.com/xee-ai/XeeSDK-iOS` |
| **A plain HTTPS request to your server URL** | When `purchase-testing` checks that something answers there | Your Xee server. It sends no data |
| **Your project files** | Reading code to find your paywall, purchase calls and Xcode scheme, and (for `xee-migration`) every call into the old SDK; editing it only after the plan you approve | Stay on your machine |

`xee-integration`, `xee-migration` and `paywall-tests` edit your project's files; `purchase-testing` and `xee-docs` only read them.

## Privacy, license and support

The plugin collects nothing. It is [MIT licensed](LICENSE). Report a problem or ask for a feature in the [issues](https://github.com/xee-ai/xee-skills/issues), and report a security problem privately as [SECURITY.md](../SECURITY.md) describes.
