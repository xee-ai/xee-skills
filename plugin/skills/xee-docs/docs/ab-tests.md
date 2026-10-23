An A/B test shows different values of one paywall variable to different users and counts who buys. You start and end tests in the dashboard; your app needs no extra code beyond reading the paywall and logging views.

## What a test is

A test runs on one variable of a paywall's latest version, for example its headline or button text. It has two arms:

| Arm | Value | Traffic |
| --- | --- | --- |
| A | The value served today: the variable's default from the code, or a winner you shipped earlier. | The rest |
| B | The new value you enter. | 5 to 95%, 50% by default |

Only one test runs on a paywall at a time. The variables come from your app's code: see [Let Claude build your paywall](/docs/claude-builds-paywall).

## Start a test

1. Open **Paywalls** and choose the paywall. The latest version lists its values, numbered as on the preview.
2. Choose **Start test** next to the value you want to test. A value that is already being tested shows **In a test** instead.
3. Fill in **Test name**, **B · new value** and **Traffic to B (%)**. For a list, put one item per line; for an on/off value, pick **On** or **Off**. B must fit the value's type.
4. Choose **Create draft**. The test opens under **A/B tests**, **Running**, marked **Draft**.
5. Choose **Start test** on the draft. Choose **Discard draft** if you change your mind.

Creating or starting a test is refused when Claude has pushed a newer version since you opened the page, or when another test is already running on the paywall. Start the test again on the latest version, or stop the running one first.

## How users are split

When a test is running, the server sends the SDK one variation per arm, each with the paywall's values, the arm's value in place of the tested one, and the arm's weight. The device picks one:

- The pick is a hash of the test's ID and the user's profile ID, mapped onto the weights. Nothing is stored on the server, and the same profile always lands in the same arm, on any device.
- A user keeps their arm for the whole test, including when the test carries on into a new version.
- A new test is a new draw, so a user can land in a different arm than in the last test.
- When no test is running, every user gets the version's own values.

Your app reads the drawn values the same way with or without a test: `getPaywallVariant(paywallId:)` and its `remoteConfig`. See [Get a paywall and its values](/docs/get-paywall).

```swift title="SwiftUI" snippet="ab-test-read-paywall"
let paywall = try await Xee.getPaywallVariant(paywallId: "main")
// paywall.paywall.abTestName is the test's name, or "default" when none is running.
// paywall.variationId is "main.v4.B" for arm B on version 4, "main.v4" with no test.
let products = try await Xee.getPaywallVariantProducts(paywallVariant: paywall)
try? await Xee.logShowPaywallVariant(paywall)
```

> [!NOTE]
> Only builds made for the latest version take part. A build made for an older version gets that version's values, with no test. The paywall's page says the same: apps built for an older version get that version's values; the latest version gets the running test.

## What counts

- **A view** is a call to `logShowPaywallVariant` for an arm's variation. Without it a test has no numbers: see [Log paywall views](/docs/log-paywall-views).
- **A purchase** counts for an arm when it is made with a product from that arm's `getPaywallVariantProducts`, so the purchase carries the arm's variation ID. See [Make purchases](/docs/make-purchases). If you buy through StoreKit yourself, pass the variation ID with `reportTransaction(_:withVariationId:)`.

## What the results show

Results appear on each running test and on each finished one under **History**. They are also what Claude reads with `get_test_results`. For each arm:

| Metric | How it is counted |
| --- | --- |
| Viewers | Distinct profiles that viewed the arm. |
| Purchasers | Distinct buyers of a purchase or trial from the arm. |
| Conversion | Purchasers divided by viewers. |
| Revenue | In USD: the purchases from the arm, and the renewals of those subscriptions. |
| Revenue per 1K viewers | Revenue divided by viewers, times 1,000. |

Only events inside the test's window count: from the moment you start it until it ends (or now, while it runs). A view counts by when it was logged, a purchase by when it was attributed. Views and purchases from every version the test ran on are added together, so a test that carried on into a new version keeps its earlier numbers. Revenue can still grow after the test ends, as the subscriptions bought during it renew.

**Probability to be best** is the chance that each arm has the highest conversion, from 20,000 draws of a Bayesian model of each arm's viewers and purchasers. It compares conversion only, not revenue. Until every arm has at least one viewer, the card says there is not enough data yet.

## End a test

A running test has a button for each arm and one to stop:

- **Ship A** or **Ship B** ends the test and makes that arm's value the one everyone on the latest version gets. On the paywall's page the value is marked **Test winner**.
- **Stop test** ends the test and keeps the current value.

Finished tests move to **History**, marked **Shipped A**, **Shipped B** or **Stopped**.

A shipped value stays in place until Claude pushes a new default for that variable. When Claude writes the winner into the code as the new default, Xee serves the code's value again, which is now the same. If Claude pushes a different default, the code's value replaces the winner.

## When Claude pushes a new version

A running test carries on into the new version when its variable keeps its key and type, and its default either stays the same or becomes the value the test's arm A already serves (a winner you shipped earlier).

It stops when the variable is removed, renamed, changes type or gets any other new default. In **History** it shows **Stopped**, with the reason, for example: *Stopped by Claude's change: the variable changed in version 5.* No winner is applied. See [Let Claude build your paywall](/docs/claude-builds-paywall) for how versions and variables change.

A draft made on an older version cannot be started. Discard it and create the test again on the latest version.

## Tests on a view

A [view](/docs/views) has no products, so a test on one is judged by a **goal**: one of the events the view declares, picked when you create the test (the last one is chosen for you). For each arm, the results show **Saw the view** (users who logged the view during the test), **Reached** the goal (those of them who sent the goal event after their first view, during the test), the **Rate**, and the **Probability to be best**. Purchases and revenue are not shown.

Everything else works as for a paywall: one running test per view, two arms, traffic from 5 to 95%, and the same rules when Claude pushes a new version, plus one: a test **stops** when the new version no longer declares its goal (*the goal event was removed in version N*).

## Claude's part

Claude can read results with `get_test_results` and suggest a test with `propose_test`, but it never starts, ships or stops one.

1. Claude sends the paywall or view, the variable and one or more values to try, with a reason. The value must fit the variable's type in the latest version. For a view, Claude also names the goal, one of the view's declared events.
2. The suggestion appears in the dashboard under **Agent**.
3. **Approve and launch** opens the new test page for that value, with the first suggested value as B. **Skip** sets it aside.
4. You still choose **Create draft**, then **Start test**.

Ask in plain words, for example: *Suggest a test for the headline of the "main" paywall and propose it in Xee.* To connect Claude, see [Use Xee in Claude](/docs/use-xee-in-claude).
