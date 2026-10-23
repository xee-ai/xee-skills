Xee has an MCP server. Once Claude Code is connected to it, Claude can read your paywalls, change their design and values, push a new version to Xee, and look at test results, without you leaving the editor. Install the Xee skills as well, and Claude knows how to add the SDK to your app, test a purchase and run paywall tests too.

## 1. Add Xee to Claude Code

Run this in a terminal:

```bash
claude mcp add --transport http xee {{server}}/mcp
```

It is saved for the project you ran it in. Add `--scope user` to use Xee in every project.

> [!TIP]
> Run it in your app's project folder, so Claude can see your paywall code and Xee together.

## 2. Sign in with your browser

Start Claude Code and run `/mcp`. Choose `xee`, then **Authenticate**. Your browser opens: sign in to Xee, check what Claude is asking for, and choose **Approve**. Go back to the terminal, where `xee` now shows as connected.

Claude Code keeps the sign-in and renews it for you. You never copy a token. Signing in gives Claude access to every app you own, as you. To take it away, remove it with `claude mcp remove xee`.

### Connect with a token instead

For a machine with no browser, a script or another tool, use a token. Open [Settings, MCP](/settings?tab=mcp), choose **Add token**, name it after where you will use it (for example CI) and create it. It is shown once, with the command already filled in; only a hash is kept, so if you lose it, revoke it and make a new one. Run:

```bash
claude mcp add --transport http xee {{server}}/mcp --header "Authorization: Bearer YOUR_TOKEN"
```

> [!IMPORTANT]
> Tokens act as you. Keep them out of code and chats, and revoke any you no longer use.

## 3. Check that it works

Run `/mcp` in Claude Code. `xee` should be listed as connected. You can also run this in a terminal:

```bash
claude mcp list
```

Then ask Claude: *List my Xee apps.*

## 4. Install the Xee skills

The MCP gives Claude access to your Xee data. The **Xee skills** teach it how to use that access well: adding the SDK to your iOS app, getting a sandbox purchase through, changing and testing a paywall, and answering from these docs. Install them once and Claude picks the right one from what you ask. You never have to name a skill.

| Skill | What it does |
| --- | --- |
| `xee-integration` | Adds the Xee SDK to your iOS app and wires activation, users, the paywall, purchases and subscription status |
| `purchase-testing` | Gets your first sandbox purchase through, and finds where it broke when one does not unlock `premium` |
| `paywall-tests` | Moves a paywall's values into Xee, pushes new versions safely, suggests tests and reads the results |
| `xee-docs` | Answers a question about Xee from the right page of these docs |

In Claude Code, run this in a terminal:

```bash
claude plugin marketplace add xee-ai/xee-skills
claude plugin install xee-skills@xee
```

Then run `/reload-plugins` inside Claude Code, or restart it. Run `/plugin` and check that `xee-skills` is listed.

For Codex:

```bash
codex plugin marketplace add xee-ai/xee-skills
codex plugin add xee-skills@xee
```

Start a new thread afterwards, so Codex picks up the skills.

For any other agent (Cursor, Copilot, Gemini CLI and more), use the [skills CLI](https://skills.sh):

```bash
npx skills add xee-ai/xee-skills --all
```

Skills installed this way do not update by themselves. Run `npx skills update` to get the latest.

Try it: open your app's project in Claude and say *Integrate Xee into my app*.

> [!NOTE]
> Every skill except `xee-docs` reads and changes your Xee data through the MCP, so finish steps 1 to 3 first. The skills ask before they edit your project, create products, or push a paywall version, and they never start a test: you do that in the dashboard.

To update the skills later in Claude Code, run `claude plugin marketplace update xee`, then `claude plugin update xee-skills@xee`. The source and the full list of install routes are at [github.com/xee-ai/xee-skills](https://github.com/xee-ai/xee-skills).

## What to ask Claude

Say the app and paywall by the IDs you see in the dashboard. A few to start with:

- List my Xee apps.
- Which paywalls does magicclip have?
- Get the paywall "main" of magicclip and show me its variables.
- Make the paywall's button say "Start free trial" and push the new version to Xee.
- How is the test on the "main" paywall doing? Which arm is ahead?
- Suggest a test for the headline of the "main" paywall and propose it in Xee.
- Sync magicclip's products from App Store Connect.
- Migrate my app from Adapty to Xee.
- Which Adapty calls does my app use, and what replaces each?
- How do I install the Xee iOS SDK? (Claude reads these docs.)

## What Claude can use

| Tool | What it does |
| --- | --- |
| `list_apps` | The apps you own in Xee, each with its public SDK key, bundle ID, Apple app ID and `in_app_purchase_key`: `true` when the In-App Purchase key is set, which is what lets the server check purchases with Apple. |
| `get_app` | One app's setup values: the same as its entry in `list_apps`, `in_app_purchase_key` included, and its languages. |
| `list_paywalls` | An app's paywalls, with whether each is live and its latest version. |
| `get_paywall` | The latest version of a paywall: its variables with their current values, its products, and the test running on it. |
| `create_paywall` | Creates an empty paywall with the ID the app will ask for and a name for the dashboard. Claude then gives it a first version with `push_paywall_version`. |
| `push_paywall_version` | Sends a new version after Claude changes the paywall view: an HTML preview with `data-xee` markers, the products and the variables. |
| `list_views` | An app's views (screens or flows without products, such as onboarding), with their latest version. |
| `get_view` | The latest version of a view: its variables with their current values, its declared events, its screens, and the test running on it. |
| `create_view` | Creates an empty view with the ID the app will ask for. Claude then gives it a first version with `push_view_version`. |
| `push_view_version` | Sends a new version after Claude changes a view: an HTML preview with one section per screen, the variables, and the events the code sends. |
| `list_products` | The app's product catalogue, for choosing which products a paywall shows. |
| `get_product` | One product: what Xee keeps, and its status, US price and display names from App Store Connect. |
| `create_product` | Adds a product to Xee. It does not create it in App Store Connect; make it there with the same product ID, then sync. |
| `sync_products` | Reads products from App Store Connect into Xee, for the whole app or one product. |
| `edit_product` | Changes a product's reference name, US price or a display name. With Sync with App Store Connect on, the change goes to Apple first; off, it stays in Xee. |
| `get_test_results` | The tests on a paywall or a view, with the numbers for each arm. A view test also shows its goal and, per arm, who reached it. |
| `propose_test` | Suggests a test for you to start, on a paywall or a view (with the event that judges it). Claude never starts a test itself; you decide in the dashboard. |
| `set_languages` | Sets the languages your paywalls and views are offered in (App settings › App Languages), usually from your app's String Catalog. Claude shows you the list and saves it after you say yes. |
| `set_translations` | Saves translations of your paywall and view texts into those languages, usually from your String Catalog, after you say yes. See [Localization](/docs/localization). |
| `list_docs` | The pages of these docs. |
| `get_doc` | One page of these docs, as Markdown. |

## Which Apple key edits products

Xee reads and edits your products through an App Store Connect API key. Reading (the Sync button on Products) works with more roles than editing, so a key can sync fine and still be refused when you change something.

- **App Manager** or **Admin** access: can sync and edit. Choose App Manager unless Apple refuses it.
- **Developer** and other roles: may sync, but editing is refused with "403".
- Make the key in App Store Connect, Users and Access, Integrations, App Store Connect API, Team Keys. A key's access cannot be changed later, so generate a new one if the role is wrong.
- Add it in [Settings, Apple keys](/settings?tab=keys), then choose it for the app in App settings, Apple keys.
- To change a price without touching App Store Connect, turn off **Sync with App Store Connect** on the product. Edits then stay in Xee.

## If it does not work

- **xee is not connected, or Claude says unauthorized.** Run `/mcp`, choose `xee` and authenticate again. If you connected with a token, it was typed wrong or has been revoked: check [Settings, MCP](/settings?tab=mcp), make a new token, then run `claude mcp remove xee` and add it again.
- **Cannot connect.** The address in the command must be `{{server}}/mcp`, not the dashboard's address.
- **"The key is not allowed to do this (403)" when editing a product.** The App Store Connect key has the wrong role. Make a new key with App Manager or Admin access, as above.
- **Claude cannot see the app.** Claude reaches only the apps of the account you signed in with, or that made the token.
- **A push is refused as out of date.** Someone pushed a newer version. Ask Claude to read the paywall again and redo the change on top of it.
