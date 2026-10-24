Your app asks Xee for a paywall by its paywall ID and gets back two things: the paywall's values (headline, button text, toggles, anything you made a variable) and the products it offers. You draw the paywall yourself with those.

## Before you start

1. Add your products in Xee under **Products**, or sync them from App Store Connect.
2. Create the paywall: **Paywalls**, then **Create paywall**. The **Paywall ID** (for example `main`) is what your app passes to the SDK, and it cannot change later.
3. Give it a version with variables and products. The easiest way is to let Claude push one from your paywall code: see [Let Claude build your paywall](/docs/claude-builds-paywall).
4. [Install the SDK](/docs/install) and activate it.

## Get the paywall

Call `Xee.getPaywallVariant(paywallId:)` with the paywall ID from the dashboard:

```swift title="Swift" snippet="get-paywall-async"
import Xee

do {
    let paywall = try await Xee.getPaywallVariant(paywallId: "main")
    // Read the values and products from `paywall`.
} catch {
    // Show the paywall with the defaults in your code.
}
```

```swift title="Swift-Callback" snippet="get-paywall-completion"
import Xee

Xee.getPaywallVariant(paywallId: "main") { result in
    switch result {
    case let .success(paywall):
        // Read the values and products from `paywall`.
        _ = paywall
    case .failure:
        // Show the paywall with the defaults in your code.
        break
    }
}
```

| Parameter | Default | What it does |
| --- | --- | --- |
| `paywallId` | required | The paywall ID you set in the dashboard. |
| `fetchPolicy` | `.reloadRevalidatingCacheData` | Whether the SDK asks the server first or reads its cache first. See below. |
| `loadTimeout` | 5 seconds | How long to wait for the server. When it runs out, you get the cached copy if there is one. It cannot be less than 1 second. |
| `locale` | the app's language | Leave it out: text comes in the language your app runs in, when you offer it in Xee, otherwise in your source language. Pass a code such as `fr` only to show the paywall in another language. |

The SDK keeps the last paywall it received on the device, and the copy survives app restarts. If the server cannot be reached and there is a cached copy, you get that copy. If there is none, the call throws, so keep working defaults in your code. It also throws when the paywall ID does not exist, the paywall is inactive, or it has no version yet.

### Fetch policies

| Policy | What it does |
| --- | --- |
| `.reloadRevalidatingCacheData` | Asks the server first and falls back to the cache if the request fails. The values are always the latest. |
| `.returnCacheDataElseLoad` | Reads the cache first and goes to the server only when nothing is cached. Faster on a weak connection, but a change in the dashboard reaches the user later. |
| `.returnCacheDataIfNotExpiredElseLoad(maxAge:)` | Reads the cache while it is younger than `maxAge` seconds, then asks the server. |

```swift snippet="get-paywall-fetch-policy"
let paywall = try await Xee.getPaywallVariant(
    paywallId: "main",
    fetchPolicy: .returnCacheDataIfNotExpiredElseLoad(maxAge: 3600),
    loadTimeout: 3
)
```

## What you get back

`getPaywallVariant` returns an `XeePaywallVariant`:

| Property | What it is |
| --- | --- |
| `paywall.id` | The paywall ID you asked for. |
| `name` | The version and arm, for example `main v4`. |
| `variationId` | Which variation this user got. During a test it names the arm; purchases are attributed by it. |
| `remoteConfig` | The paywall's values as an `XeeRemoteConfig`, or `nil` if it has none. |
| `vendorProductIds` | The App Store product IDs this version offers, in order. |
| `paywall.abTestName` | The name of the running test, or `default` when there is none. |

## Read the values

The values arrive as the paywall's remote config: one JSON object whose keys are the variable keys. `remoteConfig.jsonString` is the raw JSON and `remoteConfig.dictionary` is the same thing as `[String: Any]`.

Each variable type maps to a plain JSON value:

| Variable type | JSON | Swift |
| --- | --- | --- |
| `string` | `"Try for FREE"` | `String` |
| `int` | `3` | `Int` |
| `double` | `0.8` | `Double` |
| `bool` | `true` | `Bool` |
| `string_list` | `["Unlimited shorts", "AI captions"]` | `[String]` |

For a quick read, use the dictionary:

```swift snippet="read-values-dictionary"
let headline = paywall.remoteConfig?.dictionary?["headline"] as? String ?? "Unlock Unlimited Shorts"
let showTrialToggle = paywall.remoteConfig?.dictionary?["show_trial_toggle"] as? Bool ?? true
```

For a whole paywall, decode `jsonString` into a `Decodable` struct whose properties default to the values in your code, so a missing or mistyped key falls back instead of failing:

```swift snippet="read-values-decode"
if let json = paywall.remoteConfig?.jsonString.data(using: .utf8) {
    values = (try? JSONDecoder().decode(PaywallValues.self, from: json)) ?? PaywallValues()
}
```

The full `PaywallValues` struct, with a SwiftUI and a UIKit version, is in [Let Claude build your paywall](/docs/claude-builds-paywall).

> [!NOTE]
> Each version is pushed for an app build, and the SDK sends the app's build number (`CFBundleVersion`) with every request. Xee serves the newest version pushed for that build, or for the closest older build, so an older build keeps getting values its code understands, and a change of values only reaches the builds already out at once. Nothing to add to your app: the SDK does it. Only the latest version gets the running test.

## Get the products

Pass the paywall to `Xee.getPaywallVariantProducts(paywallVariant:)`. It loads the products from the App Store, in the order the version lists them, with offer eligibility already worked out:

```swift title="Swift" snippet="get-products-async"
do {
    let products = try await Xee.getPaywallVariantProducts(paywallVariant: paywall)
    // Show one row or button per product.
} catch {
    // StoreKit could not load the products.
}
```

```swift title="Swift-Callback" snippet="get-products-completion"
Xee.getPaywallVariantProducts(paywallVariant: paywall) { result in
    switch result {
    case let .success(products):
        // Show one row or button per product.
        _ = products
    case .failure:
        // StoreKit could not load the products.
        break
    }
}
```

Each item is an `XeePaywallVariantProduct`. The properties you will use most:

| Property | What it is |
| --- | --- |
| `vendorProductId` | The App Store product ID. |
| `localizedTitle` | The product's display name from App Store Connect. |
| `localizedPrice` | The price formatted for the user's storefront, for example `$9.99`. |
| `price`, `currencyCode`, `currencySymbol` | The price as a `Decimal` and its currency, for your own formatting. |
| `localizedSubscriptionPeriod` | The period as text, for example `1 week`. |
| `subscriptionPeriod` | The period as `unit` (`.day`, `.week`, `.month`, `.year`) and `numberOfUnits`. A quarterly plan is `.month` and `3`. |
| `subscriptionOffer` | The intro or win-back offer this user can get, or `nil`. It has `offerType`, `price`, `localizedPrice`, `localizedNumberOfPeriods` and `localizedSubscriptionPeriod`. |

> [!IMPORTANT]
> Do not hardcode product IDs or how many there are. Products are chosen per paywall version, so a new version can offer three products where the last one had two. Show every product you get back.

## Put it together

1. Get the paywall and decode its values; fall back to your defaults on error.
2. Get its products.
3. Show the paywall, then call `Xee.logShowPaywallVariant(paywall)` once it is on screen: see [Log paywall views](/docs/log-paywall-views).
4. When the user taps a product, pass it to `Xee.makePurchase(product:)`: see [Make purchases](/docs/make-purchases).

When a test runs on the paywall, you do nothing different. The SDK puts each user in one variation and keeps them there, and the values you read already carry that arm's value for the tested variable. See [A/B tests](/docs/ab-tests).
