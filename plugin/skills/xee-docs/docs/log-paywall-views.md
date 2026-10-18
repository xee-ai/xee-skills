Xee learns about purchases on its own, but not about views: only your code knows when the paywall is actually on screen. Call `Xee.logShowPaywallVariant(_:)` each time it appears.

## Why it matters

[A/B test](/docs/ab-tests) results are built on views. For each arm, **Viewers** is the number of distinct users who logged a view of that arm, and **Conversion**, **Revenue per 1K viewers** and **Probability to be best** are all divided by it.

If the app never logs views, every arm has zero viewers. Purchases still reach Xee, but the test has no conversion to compare and cannot tell you which arm is ahead.

## Log a view

Pass the `XeePaywallVariant` you got from `Xee.getPaywallVariant(paywallId:)` once the paywall is visible:

```swift title="SwiftUI" snippet="log-view-swiftui"
import SwiftUI
import Xee

struct PaywallScreen: View {
    let paywall: XeePaywallVariant
    let values: PaywallValues

    var body: some View {
        PaywallView(values: values)
            .task {
                try? await Xee.logShowPaywallVariant(paywall)
            }
    }
}
```

```swift title="UIKit" snippet="log-view-uikit"
import UIKit
import Xee

final class PaywallScreenViewController: UIViewController {
    private let paywall: XeePaywallVariant

    init(paywall: XeePaywallVariant) {
        self.paywall = paywall
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        Task { try? await Xee.logShowPaywallVariant(paywall) }
    }
}
```

With a completion handler instead of `async`:

```swift snippet="log-view-completion"
Xee.logShowPaywallVariant(paywall) { error in
    if let error {
        print("Could not log the view: \(error)")
    }
}
```

| Parameter | Required | What it is |
| --- | --- | --- |
| `paywallVariant` | yes | The `XeePaywallVariant` you are showing, from `getPaywallVariant(paywallId:)`. |

The view is queued and sent in the background with the SDK's other events, so it can take a few seconds to show up in the dashboard. The call throws an `XeeError` only when the event cannot be queued, for example when the SDK is not activated. Use `try?` so a logging problem never keeps the paywall from showing.

## When to call it

- **Each time the paywall appears on screen.** If the user closes it and it opens again later, log again. Viewers counts distinct users, so repeat views by the same person do not inflate the test.
- **After it is visible, not when you fetch it.** Fetching a paywall ahead of time, to have it ready, is not a view. Log in `.task` or `onAppear` in SwiftUI, or `viewDidAppear` in UIKit.
- **Only when it really showed.** If loading failed and you showed nothing, or the user was already subscribed and you skipped the paywall, do not log.

## Pass the same paywall you showed

A view counts for the variation on the object you pass, through its `variationId` (for example `main.v4.B` for arm B of version 4). So pass the exact `XeePaywallVariant` whose values you put on screen:

- Keep the object you fetched and hand the same one to the view, to `logShowPaywallVariant`, and to `getPaywallVariantProducts`. The products then carry the same `variationId`, and purchases count for the same arm as the view.
- Do not fetch the paywall a second time just to log it. A second fetch can return a different version or, after a test starts, a different variation than the one on screen.
- If you do fetch again and redraw the paywall with the new values, log the new object.

> [!TIP]
> The pattern in [Let Claude build your paywall](/docs/claude-builds-paywall) already does this: it fetches once, decodes the values, loads the products and logs the view from the same `paywall`.

## Check that views arrive

1. Start a test on the paywall in the dashboard (see [A/B tests](/docs/ab-tests)).
2. Open the paywall in a build made for the latest version, for example a sandbox build (see [Test purchases in the sandbox](/docs/sandbox-testing)).
3. Open the test under **A/B tests**. After a few seconds, **Viewers** for the arm you landed in goes up by one.

Only views logged while the test runs count for it, so views from before you start the test do not show up in its results. If Viewers stays at zero, see [Troubleshooting & errors](/docs/troubleshooting).
