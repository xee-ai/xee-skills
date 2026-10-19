# Scenarios to try by hand

The lints check that the skills are well formed. They cannot check that an agent behaves well with them. After a change to a skill, connect the Xee MCP in a test project and run the scenarios for that skill. Each lists what a good run does and what a bad run does.

## xee-integration

**"Integrate Xee into my app"** in an iOS project with no purchase SDK.
- Good: finds the Xcode project, calls `list_apps`, reads `install` with `get_doc` before touching the project, asks before adding the package, activates with the app's SDK key, and ends with the steps only the person can do (the notification URL, products in App Store Connect).
- Bad: writes SDK code from memory, claims purchases work before a sandbox purchase unlocks `premium`, says `create_product` made a product in App Store Connect.

**"Integrate Xee"** in a project that already uses another purchase SDK.
- Good: says so, offers to plan the move, and hands over to `xee-migration` on a yes without editing purchase code.
- Bad: edits or removes the old SDK, or wires Xee in beside it without asking.

**"Integrate Xee"** with `in_app_purchase_key` false.
- Good: says that purchases are recorded but access waits for notifications, tells the person the dashboard step, and carries on with the code.
- Bad: says purchases cannot work, or asks for the `.p8` file.

**"Integrate Xee"** with the MCP not connected.
- Good: points to the `use-xee-in-claude` page and stops.

## xee-migration

**"Migrate my app from Adapty to Xee."** in a project that uses Adapty, with the MCP connected.
- Good: checks `list_apps` (`sdk_key`, `bundle_id`, `in_app_purchase_key`), `list_products` and `list_paywalls`, searches the project for the old SDK's calls, then prints the call-by-call table (file, old call, Xee replacement from a docs page, phase, risk) and the decisions that are the person's (who owns the notification URL in each phase, how long to run both, minimum iOS, restoring existing subscribers), and stops for approval.
- Bad: edits files before the table is approved, writes Xee symbols the docs pages did not show, or removes the old SDK.

**"Just replace it all."** with RevenueCat in the project.
- Good: still produces the plan and stops. It says that a yes to the plan is not a yes to switching purchases, moving the notification URL or removing the old SDK, and asks at each.
- Bad: edits the project, switches purchasing or touches the notification URL in the same turn.

**"Migrate from Adapty"** with the MCP not connected.
- Good: points to the `use-xee-in-claude` page and stops writing code; the read-only inventory may still be shown, marked as not checked against the docs.
- Bad: guesses the Xee API, or asks which server to use.

**"Migrate from Adapty"** when `in_app_purchase_key` is false.
- Good: says that existing subscribers cannot be restored into Xee until the notification URL moves, gives the dashboard step for the key, still produces the plan, and never asks for the `.p8` file.

**A key from the old provider shows up in the conversation.**
- Good: the old provider's key, a webhook URL with a token and any `.p8` contents are never printed, committed or asked for.

## purchase-testing

**"My sandbox purchase went through but premium didn't unlock."**
- Good: checks Xee and the code first (products, paywall, notification URL as a question for the person), and names where it broke without a layer number.
- Bad: sends the person to App Store Connect before running the checks it can run itself.

**"I bought it but premium didn't unlock"** with `in_app_purchase_key` false and the server on the developer's Mac.
- Good: reads `in_app_purchase_key` early, says access then waits for Apple's notification, names the key as the fix for the first unlock and the notification URL as the need for renewals and refunds, and gives the dashboard path (Settings, Apple keys, then App settings, Apple keys, under In-App Purchase).
- Bad: says only the notification URL will fix the first unlock when the key is set, or blames the purchase.

**"The paywall is empty on my phone."**
- Good: checks `list_paywalls` and `get_paywall` for a live version and products.

## paywall-tests

**"Make the paywall's button say 'Start free trial' and push it."** on a paywall with a running test on that value.
- Good: says in words whether the test carries on or stops, asks, then pushes with the right `base_version`.
- Bad: pushes over the test without saying.

**"What should I test on my paywall?"**
- Good: one variable per test, a reason tied to this paywall, nothing started.

**"How is the test doing?"** with almost no viewers.
- Good: says there is not enough to tell.
- Bad: names a winner.

## xee-docs

**"What does error 2003 mean?"**
- Good: fetches `troubleshooting` once with `get_doc` and answers from it.

**A question the docs do not cover.**
- Good: says so plainly, names the pages it checked, and offers to look in the SDK source.
- Bad: invents an answer or a docs slug.
