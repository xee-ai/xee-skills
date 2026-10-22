Add the Xee SDK to your iOS app with Swift Package Manager, then activate it once at launch with your SDK key. Every other SDK call depends on this step.

## Requirements

- iOS 15 or later (macOS 12 and visionOS 1 are also supported).
- An Xcode version that supports Swift tools 6.0 (Xcode 16 or later).
- Swift Package Manager. The SDK is not published to CocoaPods.
- An app in Xee with its bundle ID set in App settings, iOS SDK.

> [!NOTE]
> Before purchases unlock anything, Xee also needs your products and the app's In-App Purchase key, which lets the server check each purchase with Apple. For renewals, cancellations and refunds it also needs Apple's App Store Server Notifications: paste the notification URL from App settings, iOS SDK into App Store Connect. See [Check subscription status](/docs/subscription-status) and [Make purchases](/docs/make-purchases).

## Install the SDK

1. In Xcode, choose **File**, **Add Package Dependencies**.
2. Paste the repository URL into the search field:
  `{{sdk_repo}}`
3. Choose a dependency rule and click **Add Package**. The repository has no version tags yet, so choose **Branch** and enter `main`.
4. In the list of package products, add **Xee** to your app target. **XeeLogger** comes with it; add it to a target yourself only if that target imports `XeeLogger` directly.
5. Click **Add Package**. Xee now appears under **Package Dependencies** in the project navigator.

To add it from a `Package.swift` instead, declare the dependency and the product:

```swift title="Package.swift"
dependencies: [
    .package(url: "{{sdk_repo}}", branch: "main")
],
targets: [
    .target(name: "YourApp", dependencies: [.product(name: "Xee", package: "XeeSDK-iOS")])
]
```

## Get your SDK key

Open App settings, iOS SDK in the Xee dashboard. The **SDK** section shows:

| Value | What it is |
| --- | --- |
| SDK key | The public key for this app. It starts with `xee_`. |
| Notification URL | Where Apple sends App Store Server Notifications for this app: renewals, expiry, cancellations and refunds. |

Each app in Xee has its own SDK key, so pick the right app if you have several. If Claude does the integration through the Xee MCP, it reads the key and the bundle ID for you with `list_apps`, so you do not have to paste them. The key is public: it is meant to ship inside your app. If it leaks somewhere you did not intend, rotate it on the same tab and ship the new one.

## Activate the SDK

Call `Xee.activate(withAPIKey:)` with your SDK key. Call it once per app launch, as early as you can. A second call throws an error.

```swift title="SwiftUI" snippet="activate-swiftui"
import SwiftUI
import Xee

@main
struct YourApp: App {
    init() {
        Task {
            do {
                try await Xee.activate(withAPIKey: "xee_YOUR_SDK_KEY")
            } catch {
                // error is a XeeError: log it and keep the app usable
            }
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

```swift title="UIKit" snippet="activate-uikit"
import UIKit
import Xee

final class AppDelegate: UIResponder, UIApplicationDelegate {
    // Activate here, or in scene(_:willConnectTo:options:) if you use a SceneDelegate.
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        Task {
            do {
                try await Xee.activate(withAPIKey: "xee_YOUR_SDK_KEY")
            } catch {
                // error is a XeeError: log it and keep the app usable
            }
        }
        return true
    }
}
```

If you prefer callbacks, pass a completion handler. It receives an optional `XeeError`:

```swift snippet="activate-completion"
Xee.activate(withAPIKey: "xee_YOUR_SDK_KEY") { error in
    if let error {
        // error is a XeeError: log it and keep the app usable
    }
}
```

> [!IMPORTANT]
> Wait for `activate` to finish before you call any other Xee method, such as `identify`, `getProfile` or `getPaywallVariant`. `Xee.isActivated` tells you whether activation has completed.

### Activate with a configuration

When you need more than the key, build an `XeeConfiguration` and call `Xee.activate(with:)`. The builder sets the log level, the customer user ID and app account token, observer mode and the other options under **Optional setup** below. This example turns on verbose logs:

```swift snippet="activate-with-configuration"
let configuration = XeeConfiguration
    .builder(withAPIKey: "xee_YOUR_SDK_KEY")
    .with(logLevel: .verbose) // for development; remove or lower for release
    .build()

Task {
    do {
        try await Xee.activate(with: configuration)
    } catch {
        // error is a XeeError: log it and keep the app usable
    }
}
```

`Xee.activate(with: configuration) { error in ... }` is the callback form. It passes an optional `XeeError` to the closure.

If you already know who the user is at launch, add their ID to the same configuration. See [Identify users](/docs/identify-users).

## Next steps

- [Make purchases](/docs/make-purchases) of your products.
- [Check subscription status](/docs/subscription-status) to decide what the user can open.
- [Get a paywall and its values](/docs/get-paywall) to show the paywall you set up in Xee.

## Optional setup

All of these are methods on the configuration builder. Chain the ones you need before `.build()`.

### Logging

The SDK logs at the level you choose. The default is `info`.

| Level | What is logged |
| --- | --- |
| `error` | Errors only. |
| `warn` | Errors, plus problems that are not critical but worth a look. |
| `info` | Warnings, plus messages about the SDK's lifecycle. |
| `verbose` | Everything above, plus method calls and requests. Use it while developing and for your first release. |
| `debug` | The most detail, for debugging the SDK itself. |

Set it on the builder with `.with(logLevel:)`, or at any time with `Xee.logLevel`:

```swift snippet="log-level"
Xee.logLevel = .verbose
```

To send the SDK's log messages to your own logging or to a file, register a handler. It is called for each message at the current level, in addition to the default output:

```swift snippet="log-handler"
Xee.setLogHandler { record in
    writeToLogFile("Xee \(record.level): \(record.message)")
}
```

### Data collection

By default the SDK collects the advertising identifier (IDFA) and the device's IP address. Turn either off when you do not need them, for example to stay clear of the App Tracking Transparency prompt or to collect less data under GDPR or CCPA. Both default to `false`.

```swift snippet="data-collection"
let configuration = XeeConfiguration
    .builder(withAPIKey: "xee_YOUR_SDK_KEY")
    .with(idfaCollectionDisabled: true)
    .with(ipAddressCollectionDisabled: true)
    .build()
```

### Clear data after a backup restore

With `.with(clearDataOnBackup: true)`, the SDK notices when the app was restored from an iCloud backup and deletes its local data: the cached profile, products and paywalls. It then starts clean. The default is `false`.

Only the SDK's local cache is removed. The user's purchases with Apple and their profile in Xee stay as they are.

### Transaction finishing

By default the SDK finishes each StoreKit transaction once it has handled it. If you want to run your own checks first, set `.with(transactionFinishBehavior: .manual)`. You then finish transactions yourself: implement `onUnfinishedTransaction(_:)` in your `XeeDelegate`, or call `Xee.getUnfinishedTransactions()`, and call `finish()` on each transaction when you are done. Both need iOS 15 or later.

### Callback queue

Completion handlers and delegate methods run on the main queue. To use another queue, pass it with `.with(callbackDispatchQueue:)`.
