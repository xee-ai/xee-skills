> [!NOTE] Easy migrate using Claude
> Connect the Xee MCP (see [Use Xee in Claude](/docs/use-xee-in-claude)), open your iOS project in Claude Code and paste this prompt:
>
> ```prompt
> Migrate this iOS app from my current purchase SDK (Adapty, RevenueCat or plain StoreKit) to Xee, in phases and without losing a subscriber. Use the Xee MCP and the xee-migration skill. First list my Xee apps, check my products, paywalls and In-App Purchase key, find every call to the old SDK in this project, and write me a call-by-call plan. If a paywall the app shows is missing in Xee, put creating it in the plan: its ID, products, variables with today's values, and an HTML preview of the screen. Stop after the plan. Ask me before you change the project, switch purchases to Xee, move the notification URL or remove the old SDK.
> ```

If your app already sells subscriptions through Adapty, you can move to Xee in stages without a day when nobody has access. The idea is to run both for a while, bring your existing subscribers into Xee, and remove Adapty only when your own numbers say it is safe. This page is written for Adapty. If you use RevenueCat or plain StoreKit, read the last section after the plan.

## What stays the same and what changes

The calls map almost one to one. The access level `premium`, the profile and the paywall-then-products flow work the way they do in Adapty.

| Adapty | Xee |
| --- | --- |
| `Adapty.activate`, `Adapty.identify` | `Xee.activate(with:)`, and `Xee.identify(_:withAppAccountToken:)` or the same values in the configuration. |
| `Adapty.getProfile()` | `Xee.getProfile()`. Read `profile.accessLevels["premium"]?.isActive`, as before. |
| `profile.subscriptions` | `profile.subscriptions`, keyed by product ID, with an entry for every subscription Xee has recorded, expired ones included. |
| `Adapty.getPaywall(placementId:)` | `Xee.getPaywallVariant(paywallId:)`. A placement ID becomes a paywall ID you create in Xee. |
| The paywall's remote config | `paywall.remoteConfig`. The keys you read become the version's variables. |
| `Adapty.getPaywallProducts(paywall:)` | `Xee.getPaywallVariantProducts(paywallVariant:)`, which returns `XeePaywallVariantProduct` values. |
| `Adapty.logShowPaywall` | `Xee.logShowPaywallVariant(_:)`. |
| `Adapty.makePurchase(product:)` | `Xee.makePurchase(product:)`, which returns an `XeePurchaseResult`: `.userCancelled`, `.pending` or `.success(profile:transaction:)`. |
| `Adapty.restorePurchases()` | `Xee.restorePurchases()`, which returns the `XeeProfile`. |
| Product price, period, locale, intro offer | `localizedPrice` and `price`, `subscriptionPeriod.unit` and `.numberOfUnits`, `priceLocale`, `sk2Product`, `subscriptionOffer`. |

What differs:

- Xee has one access level, `premium`. Every product in Xee unlocks it.
- Your paywall stays your own view. Xee holds its values and products. See [Get a paywall and its values](/docs/get-paywall).
- Access comes from Apple, checked by Xee. Xee asks Apple about a purchase or a restore with your In-App Purchase key, and the rest arrives in Apple's notifications. See [Make purchases](/docs/make-purchases).
- Adapty's SDK talks to Adapty's cloud; Xee's talks to Xee.

Here is the Adapty code the rest of this page replaces:

```swift title="Adapty, before"
let profile = try await Adapty.getProfile()
let isPro = profile.accessLevels["premium"]?.isActive ?? false
let paywall = try await Adapty.getPaywall(placementId: "onboarding")
let products = try await Adapty.getPaywallProducts(paywall: paywall)
Adapty.logShowPaywall(paywall)
let result = try await Adapty.makePurchase(product: product)
let restored = try await Adapty.restorePurchases()
```

## Before you start

- **The notification URL.** Apple's notifications carry renewals, expiry, cancellations and refunds. Phase 5 moves the notification URL to Xee, and you set it in App Store Connect. See [Install & configure](/docs/install).
- **The app in Xee,** with the same bundle ID as the app. Notifications and answers for another bundle are rejected.
- **Your products in Xee.** Run Sync on the Products page, or ask Claude to run `sync_products`. Claude also compares each product in Xee with App Store Connect (`get_product`). If a price, period, name or status differs, the plan says which, and on your yes Claude syncs that one product from App Store Connect. That changes Xee only, nothing at Apple. Claude never changes Xee's price with `edit_product` to make it match, because with Sync with App Store Connect on that would change the price at Apple.
- **The In-App Purchase key,** added in Settings, Apple keys and chosen for the app. Restoring existing subscribers depends on it. `list_apps` shows `in_app_purchase_key: true` when it is set.
- **The SDK key** from App settings, iOS SDK.
- **iOS 15 or later.** The SDK needs iOS 15. Raise the app's deployment target first if it is lower.
- **A plan for the notification URL.** App Store Connect takes one URL per environment: one for Production and one for Sandbox. Adapty's setup asks for a URL in the same place, so today yours is probably Adapty's. Decide before each phase which service owns it, and check Adapty's own documentation and settings for whether it can forward notifications to another URL. Until Xee owns the URL, Xee gets no renewals or cancellations.

## The plan

Do the phases in order and ship after each one. Each says how to check it and how to go back.

### Phase 0: list what you use

Search your project for `Adapty.` and write down every call, every placement ID, every remote config key, the access level you check and the product IDs. The rows of the table above are your checklist. Claude can do this: *Which Adapty calls does my app use, and what replaces each?*

- **Check:** every call has a row, and every placement has a name you will give its paywall in Xee.
- **Back out:** nothing has changed.

### Phase 1: set up Xee

1. Install the SDK without calling it yet. See [Install & configure](/docs/install).
2. Add the products and the In-App Purchase key, as above.
3. For each placement, a paywall in Xee with the Paywall ID you chose. If one is missing, Claude creates it from your paywall code: the ID, the products it offers, its variables, and an HTML preview of the screen. The plan lists the variables in two groups:
   - **Today's values**: the remote config keys the app reads, each with its live value from Adapty.
   - **Suggested new variables**: Claude reads the view and suggests a few of the values written into it that are worth testing, such as the headline, the benefits, the button text, social-proof numbers, which plan is preselected, or whether a block shows. Each one starts at what the screen shows today, so nothing changes for your users until you start a test. The plan gives the file and line for each. You choose which to keep. For the rules on what stays in code, see [Let Claude build your paywall](/docs/claude-builds-paywall#a-new-paywall-what-becomes-a-variable).

   Both groups go in the plan's variables table, as rows with key, type, default and file and line. The suggested rows are marked as suggested. They are not an optional offer at the end: choosing means you strike the rows you don't want. Translated text is a `string` row holding today's source-language text, which the app shows through its String Catalog. A plan that lists only the remote config keys, or names the suggestions without rows, is missing the second group. See [Let Claude build your paywall](/docs/claude-builds-paywall).

- **Check:** `list_paywalls` shows each paywall, live, with a version and its products.
- **Back out:** delete the paywalls. Your app does not use them yet.

### Phase 2: paywall content and products from Xee

Adapty still sells. Your paywall now reads its values and its product list from Xee. Activate Xee in observer mode so it leaves StoreKit to Adapty; in observer mode `makePurchase` is not available, which is what you want here.

```swift title="Swift" snippet="migrate-activate"
// Observer mode leaves StoreKit to Adapty. Remove observerMode when Xee takes over purchases.
try await Xee.activate(withAPIKey: "xee_YOUR_SDK_KEY", observerMode: true)
try await Xee.identify(user.id, withAppAccountToken: user.appAccountToken)
```

```swift title="Swift-Callback" snippet="migrate-activate-completion"
// Observer mode leaves StoreKit to Adapty. Remove observerMode when Xee takes over purchases.
Xee.activate(withAPIKey: "xee_YOUR_SDK_KEY", observerMode: true) { error in
    if error == nil {
        Xee.identify(user.id, withAppAccountToken: user.appAccountToken)
    }
}
```

Then read the paywall and its products from Xee:

```swift title="Swift" snippet="migrate-paywall"
// Adapty's placement ID is now the paywall ID you created in Xee.
let paywall = try await Xee.getPaywallVariant(paywallId: "onboarding")
let products = try await Xee.getPaywallVariantProducts(paywallVariant: paywall)

// The values you had in the remote config are the paywall's variables.
let headline = paywall.remoteConfig?.dictionary?["headline"] as? String ?? "Go premium"

// Once the paywall is on screen:
try? await Xee.logShowPaywallVariant(paywall)
```

The product helpers keep their meaning:

```swift title="Product helpers" snippet="migrate-product-helpers"
let price = product.localizedPrice ?? ""          // "$9.99"
let amount = product.price                        // Decimal, for your own formatting
let unit = product.subscriptionPeriod?.unit       // .day, .week, .month or .year
let count = product.subscriptionPeriod?.numberOfUnits
let locale = product.priceLocale                  // the storefront's locale
let storeKit2 = product.sk2Product                // the StoreKit 2 Product

// The intro offer, set only when this user is eligible for it.
if let offer = product.subscriptionOffer,
   offer.offerType == .introductory,
   offer.paymentMode == .freeTrial {
    let trialLength = offer.localizedNumberOfPeriods ?? ""
    let trialPeriod = offer.localizedSubscriptionPeriod ?? ""
}
```

The user still buys with `Adapty.makePurchase`, so keep loading the Adapty paywall and its products for that call and match them to the Xee products by product ID.

- **Check:** the paywall looks the same, a change to a variable in the dashboard shows in the app, and `logShowPaywallVariant` runs each time the paywall appears; see [Log paywall views](/docs/log-paywall-views).
- **Back out:** read the placement from Adapty again.

### Phase 3: run both for access, and restore subscribers into Xee

Treat a user as subscribed if either service says so.

```swift title="Access from either" snippet="migrate-both-access"
func xeePremium() async -> Bool {
    guard let profile = try? await Xee.getProfile() else { return false }
    return profile.accessLevels["premium"]?.isActive ?? false
}

// Premium if either service says so. `adaptyPremium` is what your Adapty code reads today.
func isPro(adaptyPremium: Bool) async -> Bool {
    await xeePremium() || adaptyPremium
}
```

Then ask Xee to restore users that Adapty already knows. Each user's own device does this, so the rollout is as gradual as your app update:

```swift title="Bring a subscriber in" snippet="migrate-restore-subscribers"
func bringSubscriberIntoXee(adaptyPremium: Bool) async {
    // Only when Adapty knows a subscriber that Xee does not yet.
    guard adaptyPremium, !(await xeePremium()) else { return }
    do {
        let profile = try await Xee.restorePurchases()
        // Record the outcome in your own analytics: these counts tell you when to stop using Adapty.
        track("xee_restore_found_premium", profile.accessLevels["premium"]?.isActive ?? false)
    } catch {
        // Offline, or the server could not be reached. Try again at the next launch.
    }
}
```

What `Xee.restorePurchases()` does, from the SDK's code:

- It reads the device's StoreKit history and picks the newest transaction that is not from Xcode's StoreKit testing. It sends that one transaction's original ID and the profile ID to Xee.
- Xee asks Apple, production first and then sandbox, for the statuses of that customer's subscriptions, verifies Apple's signed answer, and records every subscription Apple reports. A subscription with no matching app account token goes to the profile that restored it.
- The SDK also does this once by itself for each install and user, and again after `identify` or `logout`. It starts after the profile exists on the device, so it can be a launch after the first one. Do not rely on its timing: call restore yourself, as above, when Adapty knows a subscriber that Xee does not.

Every verified check appears in Events as `VERIFIED_WITH_APPLE`, and the subscription appears on the user's profile in Profiles.

- **Check:** in a sandbox, a subscriber bought through Adapty comes into Xee after the restore call. Your own event counts how many restores found `premium`.
- **Back out:** make `isPro` read Adapty only. Xee keeps what it recorded; it grants nothing to your app by itself.

### Phase 4: purchase, restore and status through Xee

Switch the buy button, the restore button and the status check to Xee. Remove `.with(observerMode: true)` from the configuration.

```swift title="Buy with Xee" snippet="migrate-buy"
func buyWithXee(_ product: XeePaywallVariantProduct) async {
    do {
        let result = try await Xee.makePurchase(product: product)
        if result.isPurchaseCancelled || result.isPurchasePending {
            return // Nothing was bought.
        }
        if result.profile?.accessLevels["premium"]?.isActive ?? false {
            // Unlock the paid features.
        }
    } catch {
        // Show the error and let the user try again.
    }
}
```

Keep the Adapty fallback in `isPro` until phase 6. Between phase 4 and phase 5, the notification URL is still Adapty's, so Xee does not hear about renewals and cancellations of the subscriptions it holds. Xee updates a subscription when it asks Apple (a purchase or a restore) or when a notification arrives, so a renewal can look like an expiry in Xee until then. Keep this phase short.

- **Check:** a sandbox purchase through Xee unlocks `premium` at once, and Events shows `VERIFIED_WITH_APPLE`.
- **Back out:** ship a build that buys with Adapty again. Users who bought through Xee in the meantime may need a restore in Adapty to appear there; check Adapty's documentation.

### Phase 5: move the notification URL to Xee

In App Store Connect, App Information, App Store Server Notifications, put the Xee Notification URL in Production and in Sandbox, Version 2. Do this when Xee already holds your active subscribers.

> [!WARNING]
> The URL is one per environment. After the change Adapty receives nothing: its dashboard, its renewal and refund data and its fallback in `isPro` go stale. A subscriber Xee does not hold yet, and who has not opened the new build, renews without anyone in your app seeing it. Done early, this is the step that makes paying users look expired.

Apple sends each notification to the URL set at that time. Putting Adapty's URL back later does not replay what went to Xee in between.

- **Check:** Events shows `DID_RENEW` and other notification types arriving, and a sandbox renewal updates the profile.
- **Back out:** put Adapty's URL back. Anything sent in the meantime stays with Xee.

### Phase 6: remove Adapty

Remove the Adapty SDK, and the fallback in `isPro`, only when your own numbers show the old subscribers are in Xee: the count of users for whom Adapty says `premium` and Xee does not, after they opened the new build, has been zero for as long as your longest subscription period. Keep the Adapty account until most users are off the builds that still call it.

- **Check:** Xee's active subscriptions match what you expect from App Store Connect.
- **Back out:** once Adapty is gone from the app, going back means shipping a build. Keep the old Adapty data.

## Existing subscribers

A subscriber gets into Xee when their device restores, as in phase 3, and Apple still reports the subscription. The limits:

- **Only users who open the new build.** Those who never do reach Xee only through Apple's notifications for them, and a notification is matched to a profile by its app account token. A subscription bought through Adapty may carry no token that a Xee profile has, so those notifications may match nobody. That is why phase 3 keeps Adapty as a fallback.
- **The newest transaction is the one sent.** If your app also sells consumables or one-time purchases, the newest may not be the subscription, and Apple may report nothing for it.
- **Revenue starts when Xee receives the notifications.** Verified checks count no revenue, and Xee has none of your earlier history.

Restore gives a subscription to the profile whose token the transaction carries, if a Xee profile has it; otherwise to the profile it already belongs to; otherwise to the profile that restored it. See [Identify users](/docs/identify-users).

### The trial-used check

If you read `profile.subscriptions` keys to see whether a user had a trial, nothing changes in the code:

```swift title="Used a trial before" snippet="migrate-trial-used"
func usedTrialBefore(productIds: Set<String>) async -> Bool {
    guard let profile = try? await Xee.getProfile() else { return false }
    // `subscriptions` is keyed by product ID and keeps expired ones.
    return !productIds.isDisjoint(with: profile.subscriptions.keys)
}
```

In Xee, `subscriptions` has an entry for every subscription Xee has recorded for the profile, including expired ones. For a migrating user it is filled when verification runs: their first restore, or a purchase. Until then the check says no. Use `product.subscriptionOffer` to decide whether to offer a trial; it is set only when the user is eligible. Use the profile check for copy only.

## Test the migration

1. Use a fresh sandbox account, as in [Test purchases in the sandbox](/docs/sandbox-testing).
2. Build with Xee in the phase you are testing. Buy through Adapty (phases 2 and 3) or Xee (phase 4).
3. Call `Xee.restorePurchases()`. Events shows `VERIFIED_WITH_APPLE`, and Profiles shows the subscription with a **Sandbox** label.
4. Restore on a second device signed in to the same sandbox account, with the same customer user ID. A different, anonymous profile there does not get it: the subscription belongs to the profile whose token the purchase carried.
5. Let the subscription renew in the sandbox after phase 5, and check that Events shows the renewal notification.

## RevenueCat or plain StoreKit

The server side is the same. Any purchase made without Xee can be restored into Xee, and a subscription with no token goes to the profile that restores it. The phases hold:

- **RevenueCat.** Entitlements map to `accessLevels["premium"]`, offerings to paywalls, `purchase` to `makePurchase` and `restorePurchases` to `restorePurchases`. RevenueCat also uses a notification URL in App Store Connect: decide who owns it, as in phase 5.
- **Plain StoreKit.** There is nothing to unmap. Add Xee in phase 2, buy through `Xee.makePurchase(product:)` and keep your own access logic as the fallback until Xee agrees with it. If you have no notification URL yet, phase 5 is just setting it.
