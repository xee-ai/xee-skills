Your paywall is your own view, so the purchase starts in your code: when the user taps a product, pass it to `Xee.makePurchase(product:)`. StoreKit charges the user, the SDK reports the purchase to Xee, Xee checks it with Apple, and the user's `premium` access turns on.

> [!IMPORTANT]
> Finish [Install & configure](/docs/install) first, and add the app's In-App Purchase key (see [Check subscription status](/docs/subscription-status)). Without the key, access waits for Apple's notifications. The SDK attaches the profile's app account token to every purchase, anonymous users included. [Identify the user](/docs/identify-users) before they buy if you want their access to follow them across devices.

## How access turns on

When the SDK reports a purchase, Xee asks Apple about it: "Get All Subscription Statuses" of the App Store Server API, signed with the app's In-App Purchase key. Xee verifies Apple's signed answer against Apple's root certificates and your bundle ID, and records the subscriptions for the profile. `makePurchase` returns after that, so the profile in a successful result already shows `premium`.

- **Notifications are not needed for a purchase to unlock.** The check above is enough.
- **Notifications still carry what happens later.** Renewals, expiry, cancellation, grace period and billing retry, refunds and refund-saver requests arrive while the app may be closed, and only Apple's notifications bring them. Keep the notification URL set up in App Store Connect.
- **Without the key, nothing is asked of Apple.** Access then waits for the notification for that purchase. It usually comes within seconds but can arrive after `makePurchase` returns, so the profile in the result may not show `premium` yet. Refresh it with `Xee.getProfile()` until it does, as in the examples below.
- **Production first, then sandbox.** When the SDK does not say which environment a transaction is from, Xee asks Apple's production servers and then the sandbox.
- **StoreKit testing in Xcode never unlocks.** Transactions from a StoreKit configuration file do not exist at Apple, so they are never sent and never unlock anything.
- **A failed check never fails your call.** If Apple cannot be reached, answers an error, or its answer does not verify, `makePurchase` still succeeds and the profile comes back as it stands. The failure is in Xee's log, and the notification or a later `Xee.restorePurchases()` brings the access.

Each verified check shows on the Events page as `VERIFIED_WITH_APPLE`. It counts no revenue: revenue comes from Apple's own notifications.

## Make a purchase

Pass a product you got from the paywall with `Xee.getPaywallVariantProducts(paywallVariant:)` (see [Get a paywall and its values](/docs/get-paywall)). Then check the result:

```swift title="Swift" snippet="make-purchase-async"
import Xee

func buy(_ product: XeePaywallVariantProduct) async {
    do {
        let result = try await Xee.makePurchase(product: product)
        switch result {
        case .userCancelled:
            // The user closed the App Store sheet. Leave the paywall open.
            break
        case .pending:
            // Waiting on something outside the app, such as Ask to Buy.
            break
        case let .success(profile, _):
            if profile.accessLevels["premium"]?.isActive ?? false {
                // Unlock the paid features and close the paywall.
            } else if await waitForPremium() {
                // Access arrived a moment later. Unlock and close the paywall.
            } else {
                // Paid, but access is not on yet. Say it may take a moment.
            }
        }
    } catch {
        // Show the error and let the user try again.
    }
}

/// Polls the profile until `premium` is on. It waits for Apple's notification when Xee could not check the purchase itself.
func waitForPremium() async -> Bool {
    for _ in 0..<10 {
        if let profile = try? await Xee.getProfile(),
           profile.accessLevels["premium"]?.isActive ?? false {
            return true
        }
        try? await Task.sleep(nanoseconds: 2_000_000_000)
    }
    return false
}
```

```swift title="Swift-Callback" snippet="make-purchase-completion"
import Xee

func buy(_ product: XeePaywallVariantProduct) {
    Xee.makePurchase(product: product) { result in
        switch result {
        case let .success(purchase):
            switch purchase {
            case .userCancelled, .pending:
                break
            case let .success(profile, _):
                if profile.accessLevels["premium"]?.isActive ?? false {
                    // Unlock the paid features and close the paywall.
                } else {
                    // Not on yet: refresh the profile until `premium` is on.
                    Task { _ = await waitForPremium() }
                }
            }
        case let .failure(error):
            // Show the error and let the user try again.
            print("Purchase failed: \(error)")
        }
    }
}
```

| Parameter | Required | What it is |
| --- | --- | --- |
| `product` | yes | An `XeePaywallVariantProduct` from `getPaywallVariantProducts(paywallVariant:)`. |

The call returns an `XeePurchaseResult`:

| Case | What it means |
| --- | --- |
| `.userCancelled` | The user dismissed the purchase sheet. Nothing was charged. |
| `.pending` | The purchase needs approval outside the app (for example Ask to Buy). Nothing is charged until it is approved. |
| `.success(profile:transaction:)` | StoreKit completed the purchase. `profile` is the user's `XeeProfile` after Xee checked the purchase with Apple. If the app has no In-App Purchase key, or the check failed, it may not include the new purchase yet. |

The result also has shortcuts: `isPurchaseSuccess`, `isPurchaseCancelled`, `isPurchasePending`, and `profile`, which is set only on success. For the StoreKit transaction itself, read `sk2Transaction`.

> [!NOTE]
> Every product in Xee unlocks the `premium` access level. Check `profile.accessLevels["premium"]?.isActive` to decide whether the user has paid. See [Check subscription status](/docs/subscription-status) for reading it anywhere else in the app.

### Buy from the paywall, not from a product ID

Always buy the product objects that came with the paywall. Each one carries the paywall's `variationId`, so Xee knows which paywall, version and test arm the sale came from. That is what fills the revenue on the Paywalls page and the conversion numbers of an [A/B test](/docs/ab-tests).

Do not hardcode the product list either. Which products a paywall offers is set per paywall version, so show whatever `getPaywallVariantProducts` returns, in the order it returns them.

### Offers

If the user is eligible for an introductory offer or a win-back offer on a product, it is on `product.subscriptionOffer`, and `makePurchase` applies it. Use it to show the trial or the discounted price before the user taps:

```swift snippet="purchase-offers"
if let offer = product.subscriptionOffer, offer.offerType == .introductory {
    // For example "3 days free, then $9.99/week".
    let length = offer.localizedNumberOfPeriods ?? ""
    let price = product.localizedPrice ?? ""
}
```

Show the offer only when `subscriptionOffer` is set. Advertising a trial the user cannot get charges them the full price and can get the app rejected in review.

## Restore purchases

Give the user a way to get back what they already bought, for example after reinstalling the app or on a new device. App Review expects a restore button on any screen that sells subscriptions. Call `Xee.restorePurchases()`; it reports the user's latest App Store transaction to Xee and returns their profile.

The SDK looks up the device's StoreKit history and sends the most recent transaction's ID to Xee. Xee asks Apple about it and records every subscription Apple reports for that customer on this profile. A subscription bought before Xee, with no app account token, comes onto the profile that restores it.

Restoring needs the In-App Purchase key like a purchase does. Without it, the profile shows `premium` only when Xee already holds a subscription for it, from Apple's notifications; identify the user with the same customer user ID they bought with before you restore on a new device.

```swift title="Swift" snippet="restore-async"
do {
    let profile = try await Xee.restorePurchases()
    if profile.accessLevels["premium"]?.isActive ?? false {
        // Access is back. Close the paywall.
    } else {
        // Nothing to restore. Tell the user.
    }
} catch {
    // Show the error.
}
```

```swift title="Swift-Callback" snippet="restore-completion"
Xee.restorePurchases { result in
    switch result {
    case let .success(profile):
        if profile.accessLevels["premium"]?.isActive ?? false {
            // Access is back. Close the paywall.
        }
    case let .failure(error):
        print("Restore failed: \(error)")
    }
}
```

Restoring never charges the user. If the restored subscription has expired, the profile comes back without an active `premium` level.

## Purchases started in the App Store

The SDK does not handle purchases started from the App Store page itself (promoted purchases). Do not promote in-app purchases on your App Store page: such a payment carries no app account token and no paywall `variationId`, so Xee cannot attribute it to a paywall, and without the In-App Purchase key it cannot match it to a user.

## Next

- [Check subscription status](/docs/subscription-status) to gate features on `premium`.
- [Test purchases in the sandbox](/docs/sandbox-testing) before you release.
- [Troubleshooting & errors](/docs/troubleshooting) when a purchase fails.
