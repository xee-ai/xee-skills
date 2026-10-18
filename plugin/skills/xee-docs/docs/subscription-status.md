To decide whether to show paid content or a paywall, check the user's access level in their Xee profile. You do not check product IDs in your code: every product in Xee unlocks the `premium` access level.

## Before you start

A profile learns about a subscription in two ways:

- **From the SDK.** When the app reports a purchase or a restore, Xee asks Apple about it with your app's In-App Purchase key and records the answer, so `premium` is on right after the purchase. This needs the key and nothing else: it works with a local server too, because your server calls Apple and Apple never has to reach it.
- **From Apple's notifications.** Apple sends signed App Store Server Notifications to your Xee server for everything that happens later while the app may be closed: renewals, expiry, cancellation, grace period and billing retry, and refunds. Without them, a renewal or a cancellation never reaches the profile.

Set up both:

1. **In-App Purchase key.** In App Store Connect, go to Users and Access, Integrations, In-App Purchase and generate a key. Add it in [Settings, Apple keys](/settings?tab=keys) with its Issuer ID, Key ID and `.p8` file, then choose it for the app in App settings, Apple keys, under **In-App Purchase**. With Claude connected, `list_apps` shows `in_app_purchase_key: true` once it is set.
2. **Notification URL.** Open App settings, iOS SDK in the Xee dashboard and copy the **Notification URL**. In App Store Connect, open your app, **App Information**, **App Store Server Notifications**, paste the URL for both **Production** and **Sandbox**, and choose **Version 2**. Your Xee server must be reachable from the internet over HTTPS for Apple to deliver them.

The bundle ID in App settings, iOS SDK must match your app: Xee rejects notifications, and answers from Apple, for any other bundle.

> [!IMPORTANT]
> Without the In-App Purchase key, Xee asks Apple nothing and a profile changes only when Apple's notification reaches your server. That can come after the purchase call returns, and it does not come at all while Apple cannot reach your server, such as a local one. Add the key first. See [Make purchases](/docs/make-purchases) for how the check works and [Identify users](/docs/identify-users) for which profile gets the subscription.

## Get the profile

Call `Xee.getProfile()` when you need the current state, for example at launch or before opening a paid screen. It asks the server each time. If the server cannot be reached, it returns the cached profile instead.

```swift title="async/await" snippet="get-profile-async"
do {
    let profile = try await Xee.getProfile()
    if profile.accessLevels["premium"]?.isActive ?? false {
        // unlock paid features
    }
} catch {
    // error is a XeeError
}
```

```swift title="Completion handler" snippet="get-profile-completion"
Xee.getProfile { result in
    if let profile = try? result.get(),
       profile.accessLevels["premium"]?.isActive ?? false {
        // unlock paid features
    }
}
```

`accessLevels` is keyed by access level ID. Xee has one, `premium`, and a profile with no access has no entry for it, so treat a missing entry as no access.

## What an access level tells you

`profile.accessLevels["premium"]` is a `XeeProfile.AccessLevel`. The fields Xee fills:

| Property | Meaning |
| --- | --- |
| `isActive` | Whether the user has access now. Check this one to unlock content. |
| `vendorProductId` | The App Store product that gave the access. |
| `activatedAt` | When Apple signed the notification or the transaction behind this state. |
| `expiresAt` | When access ends, if Apple gave an end date. |
| `willRenew` | Whether the subscription will renew. `false` once the user turns off auto-renew. |
| `unsubscribedAt` | Set when auto-renew is off. |
| `isInGracePeriod` | Whether Apple is still retrying a failed payment while access stays on. |
| `billingIssueDetectedAt` | Set when Apple reported a billing problem. |
| `isRefund` | Whether the purchase was refunded or revoked. |

A user who turns off auto-renew keeps `isActive` true until `expiresAt`. The profile also has `subscriptions`, keyed by product ID, with the same kind of detail per product, plus `isSandbox`. It has an entry for every subscription Xee has recorded for the profile, expired ones included, so a missing key means Xee has no record of that product for this user. `profileId` and `customerUserId` identify the profile.

## Listen for profile updates

To keep the latest profile without asking for it, set a delegate. The SDK calls `didLoadLatestProfile(_:)` whenever it loads a newer profile, including after a purchase and on its regular refresh while the app is open (about once a minute). A renewal, a cancellation or a refund reaches the profile through Apple's notification, and a later refresh brings it to the app.

```swift snippet="profile-delegate"
import Xee

final class SubscriptionManager: XeeDelegate {
    func didLoadLatestProfile(_ profile: XeeProfile) {
        let hasAccess = profile.accessLevels["premium"]?.isActive ?? false
        // store hasAccess and update your UI
    }
}

// After Xee.activate has finished:
Xee.delegate = subscriptionManager
```

`XeeDelegate` requires a class that is `Sendable`. `Xee.delegate` holds it strongly, so you can set it once and leave it. The method runs on the main queue unless you set another with `.with(callbackDispatchQueue:)`; see [Install & configure iOS SDK](/docs/install).

> [!NOTE]
> The SDK also calls `didLoadLatestProfile(_:)` when it starts, with the cached profile. That lets you show the right state at launch, even offline.

## Decide what to show

Check access where the decision is made: at launch, when the user opens a paid section, or before you show paid content. If there is no access, show your paywall; see [Get a paywall and its values](/docs/get-paywall).

```swift title="SwiftUI" snippet="has-premium-swiftui"
func hasPremium() async -> Bool {
    do {
        let profile = try await Xee.getProfile()
        return profile.accessLevels["premium"]?.isActive ?? false
    } catch {
        return false
    }
}

// In your view:
.task {
    if !(await hasPremium()) {
        showPaywall = true
    }
}
```

```swift title="UIKit" snippet="has-premium-uikit"
func hasPremium() async throws -> Bool {
    let profile = try await Xee.getProfile()
    return profile.accessLevels["premium"]?.isActive ?? false
}

// In your view controller:
Task {
    if !(try await hasPremium()) {
        presentPaywall()
    }
}
```

## The cached profile

The SDK keeps the last profile it loaded on the device. `getProfile()` falls back to it when the server cannot be reached, and the delegate receives it at launch. You cannot read the cache directly; it is refreshed whenever the SDK loads the profile from the server.

## Next steps

- [Identify users](/docs/identify-users) so purchases are linked to their profile.
- [Test purchases in the sandbox](/docs/sandbox-testing) to see a profile change end to end.
