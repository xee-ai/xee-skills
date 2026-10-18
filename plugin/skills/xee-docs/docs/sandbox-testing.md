Before you release, buy each product with an Apple sandbox account and check that the purchase reaches Xee. Sandbox purchases cost nothing, and Xee marks them so you can tell them apart from real ones.

## How a test purchase reaches Xee

Xee does not take the app's word for a purchase. Access comes from the signed App Store Server Notifications Apple sends to your Xee server, so a test purchase only unlocks `premium` once Apple's notification has arrived.

- Apple sends sandbox and TestFlight purchases to the **Sandbox** notification URL in App Store Connect, and App Store purchases to the **Production** one. Xee uses the same URL for both and records which environment each notification came from.
- Your Xee server must be reachable from the internet over HTTPS. Apple cannot reach a server running on `127.0.0.1`, so when you test against a local server, put it behind a tunnel and use the tunnel's address as the server URL.
- Purchases made with a StoreKit configuration file in Xcode never leave your Mac. Apple sends no notification for them, so they do not unlock anything in Xee. Test with a sandbox account instead.
- A sandbox notification never changes a subscription that came from production. Testing on a device that also has a real subscription does not overwrite it.

## 1. Set the notification URL

1. In Xee, open App settings, iOS SDK and copy the **Notification URL**. It looks like `{{server}}/v1/notifications/apple/your-app-id`.
2. In App Store Connect, open your app, then App Information, App Store Server Notifications.
3. Paste the URL for both **Production Server URL** and **Sandbox Server URL**, and choose **Version 2** for each.

> [!IMPORTANT]
> The **Bundle ID** in App settings, iOS SDK must match your app exactly. Xee rejects notifications for any other bundle, so a typo there means no purchase ever arrives.

## 2. Create a sandbox account

1. In App Store Connect, go to Users and Access, Sandbox, Test Accounts and add an account.
2. Choose the **Country or Region** you want to test. It decides which products are available and which currency the prices show in.
3. The email does not need to be a real inbox, but you cannot reuse an address that already has an Apple Account.

Use a fresh account when you want to test a first purchase or an introductory offer. An account that already bought a product keeps it, and it is not eligible for the trial again.

## 3. Sign in on the device

Test on a real device. The simulator can run sandbox purchases, but not every payment sheet and prompt behaves the same.

1. On the device, turn on Developer Mode in Settings, Privacy & Security. The option appears after the device has been connected to a Mac running Xcode.
2. Go to Settings, Developer, Sandbox Apple Account and sign in with the sandbox account.
3. To repeat a test with the same account, open Settings, Developer, Sandbox Apple Account, choose **Manage** and clear its purchase history.

Your normal Apple Account stays signed in for everything else. Only in-app purchases use the sandbox account.

## 4. Run the app and buy

Build and run from Xcode, or install a TestFlight build. TestFlight purchases are sandbox purchases too, and their notifications go to the Sandbox URL.

> [!WARNING]
> With TestFlight, sign in to the sandbox account before you open the app for the first time. If you open it while signed in only to your own Apple Account, purchases are tied to that account. Delete the app, sign in to the sandbox account and install it again.

On a device the SDK needs your server's address: its default, `http://localhost:7010`, is the Xee server on your Mac, which only the Simulator reaches. Set `.with(serverUrl:)`, and turn on verbose logs while you test so the console shows each request the SDK makes:

```swift snippet="sandbox-verbose-logs"
let configuration = XeeConfiguration.builder(withAPIKey: "xee_YOUR_SDK_KEY")
    .with(serverUrl: URL(string: "{{server}}")!)
    .with(logLevel: .verbose)
    .build()
try await Xee.activate(with: configuration)
```

Then open your paywall and buy a product. Sandbox subscriptions renew on a shortened schedule (a month lasts minutes), so you can watch renewals and expiry happen within one session.

## 5. Check the purchase in Xee

- **Events.** Every notification from Apple is listed with its type, subtype and environment. Sandbox ones carry a **Sandbox** label. A `SUBSCRIBED` event should appear within seconds of the purchase. If the list stays empty, see [Troubleshooting & errors](/docs/troubleshooting).
- **Profiles.** Open the user's profile. The subscription card shows the state and expiry, and each sandbox entry in User history has a **Sandbox** label.
- **In the app.** `profile.accessLevels["premium"]?.isActive` should be `true`. If the purchase call returned before Apple's notification arrived, call `Xee.getProfile()` again, or wait for `didLoadLatestProfile` on your `XeeDelegate`.

> [!NOTE]
> Xee does not filter sandbox purchases out of the overview and Analytics charts. Expect test purchases to show up in your numbers, and keep test traffic to a test app if you need clean charts.

Also test restoring: delete the app, install it again, sign in to the same sandbox account and tap your restore button. `Xee.restorePurchases()` should return a profile with `premium` active.

## Release checklist

Go through this before you submit a build for review.

1. **SDK key.** The key in `XeeConfiguration.builder(withAPIKey:)` is the one shown in App settings, iOS SDK for this app. If you rotated it, ship the new one.
2. **Server URL.** `.with(serverUrl:)` points to your production Xee server over HTTPS, not the default `http://localhost:7010`, another local address or a tunnel.
3. **Notification URL.** It is set for both Production and Sandbox in App Store Connect, with Version 2, and the Bundle ID in App settings matches the app.
4. **Products.** Every product the paywalls offer exists in App Store Connect with the same product ID, and you have run Sync on the Products page so Xee has them. Products need complete metadata in App Store Connect before StoreKit returns them.
5. **Paywall.** Each paywall ID your code asks for exists in Xee, is live and has at least one version. A paywall that is not live is not served to the SDK. See [Get a paywall and its values](/docs/get-paywall).
6. **Paywall views.** Your code calls `Xee.logShowPaywallVariant(_:)` each time the paywall appears, or tests have no views to compare. See [Log paywall views](/docs/log-paywall-views).
7. **Restore button.** Every screen that sells a subscription has a restore button that calls `Xee.restorePurchases()`. App Review checks for it.
8. **Identified users.** If you use your own user IDs, `Xee.identify(_:withAppAccountToken:)` runs before the first purchase, so a user's access follows them across devices. See [Identify users](/docs/identify-users).
9. **Log level.** Switch back from `.verbose` to the default (`.info`) or `.error` for release.
10. **Refund saver.** If you turned on [Refund saver](/docs/refund-saver), your privacy policy covers sharing purchase data with Apple and the app reports the user's consent.
11. **Agreements.** The Paid Applications agreement is active in App Store Connect, or StoreKit returns no products at all.
