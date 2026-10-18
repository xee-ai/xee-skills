Your paywall is your own view, so the purchase starts in your code: when the user taps a product, pass it to `Xee.makePurchase(product:)`. StoreKit charges the user, the SDK reports the purchase to Xee, and the user's `premium` access turns on once Apple tells Xee about it.

> [!IMPORTANT]
> Finish [Install & configure](/docs/install) first. Xee matches a purchase to a profile by its app account token. The SDK attaches the profile's token to every purchase, anonymous users included, so a purchase unlocks `premium` on the profile that made it. [Identify the user](/docs/identify-users) before they buy if you want their access to follow them across devices.

## How access turns on

Xee does not grant access when the SDK reports a purchase. It grants it when Apple's signed server notification for that transaction arrives, matched to the profile by the app account token described above.

The notification usually comes within seconds of the purchase, but it can come after `makePurchase` returns. So the profile in a successful result may not show `premium` yet. Refresh it with `Xee.getProfile()` until it does, as in the examples below.

## Make a purchase

Pass a product you got from the paywall with `Xee.getPaywallVariantProducts(paywallVariant:)` (see [Get a paywall and its values](/docs/get-paywall)). Then check the result:

```swift title="async/await" snippet="make-purchase-async"
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
        case .success:
            if await waitForPremium() {
                // Unlock the paid features and close the paywall.
            } else {
                // Paid, but access is not on yet. Say it may take a moment.
            }
        }
    } catch {
        // Show the error and let the user try again.
    }
}

/// Polls the profile until Apple's notification has turned `premium` on.
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

```swift title="Completion handler" snippet="make-purchase-completion"
import Xee

func buy(_ product: XeePaywallVariantProduct) {
    Xee.makePurchase(product: product) { result in
        switch result {
        case let .success(purchase):
            switch purchase {
            case .userCancelled, .pending:
                break
            case .success:
                // Refresh the profile until `premium` is on.
                Task { _ = await waitForPremium() }
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
| `.success(profile:transaction:)` | StoreKit completed the purchase. `profile` is the user's `XeeProfile` as Xee had it at that moment, which may not include the new purchase yet. |

The result also has shortcuts: `isPurchaseSuccess`, `isPurchaseCancelled`, `isPurchasePending`, and `profile`, which is set only on success. For the StoreKit transaction itself, read `sk2Transaction` (iOS 15 and later) or `sk1Transaction`.

> [!NOTE]
> Every product in Xee unlocks the `premium` access level. Check `profile.accessLevels["premium"]?.isActive` to decide whether the user has paid. See [Check subscription status](/docs/subscription-status) for reading it anywhere else in the app.

### Buy from the paywall, not from a product ID

Always buy the product objects that came with the paywall. Each one carries the paywall's `variationId`, so Xee knows which paywall, version and test arm the sale came from. That is what fills the revenue on the Paywalls page and the conversion numbers of an [A/B test](/docs/ab-tests).

Do not hardcode the product list either. Which products a paywall offers is set per paywall version, so show whatever `getPaywallVariantProducts` returns, in the order it returns them.

### Offers

If the user is eligible for an introductory offer, a promotional offer or a win-back offer on a product, it is on `product.subscriptionOffer`, and `makePurchase` applies it. Use it to show the trial or the discounted price before the user taps:

```swift snippet="purchase-offers"
if let offer = product.subscriptionOffer, offer.offerType == .introductory {
    // For example "3 days free, then $9.99/week".
    let length = offer.localizedNumberOfPeriods ?? ""
    let price = product.localizedPrice ?? ""
}
```

Show the offer only when `subscriptionOffer` is set. Advertising a trial the user cannot get charges them the full price and can get the app rejected in review.

## Restore purchases

Give the user a way to get back what they already bought, for example after reinstalling the app or on a new device. App Review expects a restore button on any screen that sells subscriptions. Call `Xee.restorePurchases()`; it sends the user's App Store history to Xee and returns their profile.

Restoring does not grant access by itself. The profile shows `premium` when Xee has already received Apple's notifications for a subscription tied to this profile, so identify the user with the same customer user ID they bought with before you restore on a new device.

```swift title="async/await" snippet="restore-async"
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

```swift title="Completion handler" snippet="restore-completion"
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

A user can start buying one of your in-app purchases from the App Store page itself (a promoted purchase). When that purchase reaches the app, the SDK asks your `XeeDelegate` through `shouldAddStorePayment(for:)`:

- Return `true` (the default when you do not implement it) to show the payment sheet right away.
- Return `false` to hold it, keep the `XeeDeferredProduct`, and finish it later with `Xee.makePurchase(product:)`, for example after onboarding.

```swift title="Delegate" snippet="promoted-purchase-delegate"
import Xee

final class PurchaseDelegate: XeeDelegate {
    func didLoadLatestProfile(_ profile: XeeProfile) {}

    func shouldAddStorePayment(for product: XeeDeferredProduct) -> Bool {
        // Keep `product` somewhere, then return false to wait.
        false
    }
}

// Later, when the app is ready:
func resume(_ product: XeeDeferredProduct) async {
    do {
        _ = try await Xee.makePurchase(product: product)
    } catch {
        // Show the error.
    }
}
```

Set the delegate with `Xee.delegate = PurchaseDelegate()` early in launch, before you activate the SDK.

> [!WARNING]
> Either way, the SDK sends the App Store's payment as it came, without an app account token, and the purchase carries no paywall `variationId`. Xee cannot match the purchase to a user, so access does not turn on. Do not promote in-app purchases on your App Store page.

## Next

- [Check subscription status](/docs/subscription-status) to gate features on `premium`.
- [Test purchases in the sandbox](/docs/sandbox-testing) before you release.
- [Troubleshooting & errors](/docs/troubleshooting) when a purchase fails.
