This page covers the problems people hit most often with Xee and lists every error code the iOS SDK can return. Start with the logs: most errors wrap an underlying StoreKit or network error, and verbose logs print it.

## Turn on logs

Set the level when you build the configuration, so it applies from the first call:

```swift snippet="troubleshooting-verbose-configuration"
let configuration = XeeConfiguration.builder(withAPIKey: "xee_YOUR_SDK_KEY")
    .with(serverUrl: URL(string: "{{server}}")!)
    .with(logLevel: .verbose)
    .build()
```

You can also change it at any time with `Xee.logLevel = .verbose`. The levels, from least to most output:

| Level | What it logs |
| --- | --- |
| `.error` | Errors only. |
| `.warn` | Errors, plus problems that do not stop the SDK. |
| `.info` | Warnings, plus the lifecycle of the SDK's parts. This is the default. |
| `.verbose` | Everything above, plus each method call and API request. Use it while debugging. |
| `.debug` | The most detail. Only for digging into the SDK itself. |

Logs go to the system log, so they show in the Xcode console and in Console.app. To also keep them yourself, for example to attach them to a bug report, add a handler. It runs in addition to the default output, not instead of it:

```swift snippet="troubleshooting-log-handler"
Xee.setLogHandler { record in
    MyLogFile.append("\(record.date) [\(record.level)] \(record.message)")
}
```

Switch back to `.info` or `.error` before you release.

## Handle errors

Every SDK method throws `XeeError`. Its `xeeErrorCode` says what kind of failure it was, and `originalError` holds the StoreKit, network or system error it wraps, when there is one. Errors the SDK raises itself, such as calling a method before activation, have no original error.

```swift snippet="handle-errors"
do {
    let paywall = try await Xee.getPaywallVariant(paywallId: "main")
    let products = try await Xee.getPaywallVariantProducts(paywallVariant: paywall)
    // Show the paywall.
} catch let error as XeeError {
    switch error.xeeErrorCode {
    case .networkFailed:
        // Offline or the server is unreachable. Offer a retry.
        break
    case .badRequest:
        // The paywall ID is wrong, or the paywall is not live.
        break
    default:
        print("Xee: \(error), caused by: \(String(describing: error.originalError))")
    }
} catch {
    print("Unexpected: \(error)")
}
```

`XeeError` is also an `NSError` in the `XeeErrorDomain` domain, and its `errorCode` is the number in the tables below.

> [!NOTE]
> On iOS 15 and later, a user who closes the payment sheet is not an error: `makePurchase(product:)` returns `.userCancelled`. You see `paymentCancelled` (2) mainly on iOS 13 and 14, where the SDK uses the older StoreKit API.

## Common problems

### No notifications in Events

The Events page lists every notification Apple sent to Xee. If it stays empty after a purchase:

- Check that the **Notification URL** from App settings, iOS SDK is pasted in App Store Connect for both Production and Sandbox, with **Version 2** chosen.
- Check that the **Bundle ID** in App settings, iOS SDK matches the app. Notifications for another bundle are rejected.
- If you set the **Apple app ID**, check it too. Xee rejects a production notification whose app ID does not match.
- Your server must be reachable from the internet over HTTPS. Apple cannot reach `127.0.0.1` or a private network.
- Purchases made with a StoreKit configuration file in Xcode never reach Apple's servers, so no notification is sent. Use a sandbox account, as in [Test purchases in the sandbox](/docs/sandbox-testing).

### Purchase succeeded but premium is not active

This is how Xee works today. The server does not grant access on the app's word. When the SDK reports a purchase, Xee returns the profile as it stands, and access only appears after Apple's notification for that purchase has arrived and been matched to the profile.

Xee matches a notification to a profile through the app account token that StoreKit attaches to the purchase. The SDK attaches the profile's token to every purchase, anonymous users included. A promoted purchase started from your App Store page carries no token, and Xee cannot tell whose it is. See [Make purchases](/docs/make-purchases).

To check:

1. Open Events and find the purchase notification. If it is missing, see the section above.
2. Refresh the profile with `Xee.getProfile()` a few seconds after the purchase, or update your UI from `didLoadLatestProfile` on your `XeeDelegate`.

### notActivated (2002)

The SDK was called before `Xee.activate` finished, or the server refused the SDK key. Xee answers an unknown key with 401, and the SDK reports any 401 or 403 as `notActivated`.

- Await `activate` (or wait for its completion handler) before any other call, including calls from a splash screen.
- Copy the SDK key again from App settings, iOS SDK. If someone rotated it, the old key stops working.

### badRequest (2003) when getting a paywall

The server could not serve the paywall. Usually the paywall ID is not in this app, the paywall is not live, or it has no version yet. Check the ID on the Paywalls page and that the SDK key belongs to the same app.

### noProductIDsFound (1000)

StoreKit returned none of the products the paywall asked for. Check that:

- The product IDs in Xee match App Store Connect exactly. Run Sync on the Products page.
- The products have all their metadata in App Store Connect and the Paid Applications agreement is active.
- The device's storefront sells the products. A sandbox account's country decides this.

### cantMakePayments (1003)

In-app purchases are blocked on the device, for example by Screen Time restrictions. You also get it when the SDK runs in observer mode (`.with(observerMode: true)`): your own code then makes purchases, and `makePurchase` is not available. Use one or the other.

### identify fails

`Xee.identify(_:withAppAccountToken:)` throws when the server refuses the request for good, and the app keeps the profile it had. The SDK retries only what can pass: a timeout, a 429, a 5xx or no connection. Any other 4xx ends the call with the matching error, as in the tables below. A wrong SDK key gives `notActivated`; the cases below give `badRequest` (2003), with a 409 from the server:

- **The token belongs to another profile.** Each app account token can be used by one profile. Pass the token generated for this user, not one shared by several accounts or devices.
- **The profile already has a different customer user ID.** A profile's customer user ID cannot be changed once set. Call `Xee.logout()` first, then identify the new user.

An ID that already belongs to another profile is not an error: `identify` switches the device to that profile. See [Identify users](/docs/identify-users).

### profileWasChanged (3006)

A call was still running when the user changed, for example a purchase started while `Xee.identify` was in flight. Await `identify` (and `logout`) before anything that depends on the user.

## Error codes

### StoreKit

These pass on the code StoreKit gave. Read `originalError` for Apple's full error.

| Error | Code | What it means |
| --- | --- | --- |
| `unknown` | 0 | Something unexpected failed. Retry, and check the logs. |
| `clientInvalid` | 1 | The user or device is not allowed to make this request. |
| `paymentCancelled` | 2 | The user cancelled the payment. Nothing to fix. |
| `paymentInvalid` | 3 | The App Store did not recognise a payment parameter. |
| `paymentNotAllowed` | 4 | The user is not allowed to authorize payments on this device. |
| `storeProductNotAvailable` | 5 | The product is not sold in the user's storefront. |
| `cloudServicePermissionDenied` | 6 | The user did not allow access to cloud service information. |
| `cloudServiceNetworkConnectionFailed` | 7 | The device could not connect to the network. |
| `cloudServiceRevoked` | 8 | The user revoked permission to use the cloud service. |
| `privacyAcknowledgementRequired` | 9 | The user has not yet accepted Apple's privacy policy. |
| `unauthorizedRequestData` | 10 | The app used a StoreKit property it lacks the entitlement for. |
| `invalidOfferIdentifier` | 11 | The offer ID does not exist in App Store Connect, or the offer was revoked. |
| `invalidSignature` | 12 | The signature on a promotional offer is not valid. |
| `missingOfferParams` | 13 | A promotional offer is missing parameters. |
| `invalidOfferPrice` | 14 | The offer's price is no longer valid. An offer must cost less than the product. |

### Purchases and products

| Error | Code | What it means |
| --- | --- | --- |
| `noProductIDsFound` | 1000 | None of the requested products could be loaded from the App Store. See above. |
| `productRequestFailed` | 1002 | Loading products from StoreKit failed. Retry later. |
| `cantMakePayments` | 1003 | Purchases are not possible on this device, or the SDK is in observer mode. See above. |
| `cantReadReceipt` | 1005 | No valid receipt on the device. In the sandbox there is none until the first purchase. |
| `productPurchaseFailed` | 1006 | The purchase failed. `originalError` holds the StoreKit reason, usually one of codes 0 to 14. |
| `refreshReceiptFailed` | 1010 | Refreshing the receipt failed. |
| `fetchSubscriptionStatusFailed` | 1020 | Reading the subscription status from the App Store failed. |
| `unknownTransactionId` | 1030 | A transaction had no identifier. |
| `paymentPendingError` | 1050 | The payment is waiting on approval, such as Ask to Buy. |

### Network and server

| Error | Code | What it means |
| --- | --- | --- |
| `notActivated` | 2002 | The SDK is not activated yet, or the server refused the SDK key (401 or 403). See above. |
| `badRequest` | 2003 | The server answered with a 4xx, for example 404 when a paywall is not found or not live, or 409 when `identify` is refused. |
| `serverError` | 2004 | The server answered with a 5xx or 429. Retry later, and check the server's logs. |
| `networkFailed` | 2005 | The request did not get through: no connection, a timeout, or a wrong server URL. On a device, also an app with no `.with(serverUrl:)`: its default, `http://localhost:7010`, is the server on your Mac and only the Simulator reaches it. |
| `decodingFailed` | 2006 | The SDK could not read a response or a stored file. |
| `encodingFailed` | 2009 | The SDK could not build a request. |

### General

| Error | Code | What it means |
| --- | --- | --- |
| `analyticsDisabled` | 3000 | The event was not sent because analytics are turned off for this user. |
| `wrongParam` | 3001 | A parameter you passed is not valid. The message says which. |
| `activateOnceError` | 3005 | `activate` was called more than once. Call it once per launch. |
| `profileWasChanged` | 3006 | The user changed while the call was running. See above. |
| `unsupportedData` | 3007 | The data is in a format the SDK does not support. |
| `unidentifiedUserLogout` | 3020 | `logout` was called while no user was identified. |
| `fetchTimeoutError` | 3101 | Loading took longer than the timeout you set. |
| `operationInterrupted` | 9000 | The system interrupted the operation, for example because its task was cancelled. |

## Still stuck

- Reproduce the problem with `.verbose` logs and keep the full console output.
- Check the Events page and the user's profile to see what Xee received.
- Check your Xee server's logs. It logs every notification it rejects, with the reason, such as a wrong bundle ID.
