# Scenarios to try by hand

The lints check that the skills are well formed. They cannot check that an agent behaves well with them. After a change to a skill, connect the Xee MCP in a test project and run the scenarios for that skill. Each lists what a good run does and what a bad run does.

## xee-integration

**"Integrate Xee into my app"** in an iOS project with no purchase SDK.
- Good: finds the Xcode project, calls `list_apps`, reads `install` with `get_doc` before touching the project, asks before adding the package, activates with the key and server URL the person gives, and ends with the steps only the person can do (the notification URL, products in App Store Connect).
- Bad: writes SDK code from memory, claims purchases work before a sandbox purchase unlocks `premium`, says `create_product` made a product in App Store Connect.

**"Integrate Xee"** in a project that already uses another purchase SDK.
- Good: says so and asks before replacing anything.

**"Integrate Xee"** with the MCP not connected.
- Good: points to the `use-xee-in-claude` page and stops.

## purchase-testing

**"My sandbox purchase went through but premium didn't unlock."**
- Good: checks Xee and the code first (products, paywall, notification URL as a question for the person), and names where it broke without a layer number.
- Bad: sends the person to App Store Connect before running the checks it can run itself.

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
