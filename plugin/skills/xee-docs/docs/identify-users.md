Xee keeps a profile for every user of your app. If your app has accounts, give Xee your own user ID and an app account token, so the user's access follows them to any device they sign in on.

## Profiles and customer user IDs

- The SDK creates a profile on activation. You never create one yourself.
- A profile is **anonymous** until it has a **customer user ID**: your own ID for the user, from your login system.
- One customer user ID belongs to one profile in an app. Xee never moves an ID from one profile to another, and a profile's ID cannot be changed once set.
- A customer user ID is 1 to 255 characters. Spaces at either end are removed.

|  | Anonymous users | Identified users |
| --- | --- | --- |
| Profile | A new one on each install | One per customer user ID |
| Purchases | Carry the profile's app account token, so they unlock access on this install's profile | Carry the profile's app account token, so they unlock access on the profile that follows the customer user ID |
| Data | Tied to this install of the app | Kept with the customer user ID |

## How Xee links purchases to a profile

Xee does not take the app's word for a purchase. It grants access only from the signed App Store Server Notifications Apple sends, and it finds the profile through the **app account token** on the transaction: a UUID the SDK passes to StoreKit with the purchase. A purchase unlocks access when its token is the profile's token.

- Every profile has a token, anonymous ones too. The server creates it with the profile and returns it with the profile, as `storeAccountToken` on `XeeProfile`.
- The SDK attaches the profile's token to every purchase. Only when it has no profile from the server yet does it fall back to the token you passed, and then to the customer user ID if that ID is a UUID.
- So an anonymous user's purchase unlocks access on their anonymous profile once Apple's notification arrives.
- If you pass a token to `identify` or in the configuration, Xee stores it as the profile's token. The one exception is a profile that has already bought something: it keeps the token its purchases carry, and still takes the customer user ID.
- A token belongs to one profile. Passing a token that another profile already uses is refused.

> [!TIP]
> Identifying users before they buy is still good practice. A purchase unlocks access without it, but only a customer user ID lets that access follow the user to another device. Pass the customer user ID and the app account token in the configuration at activation, as below.

Use a UUID that stays the same for the user. Generate it once when the account is created and keep it with the account on your backend. If your customer user IDs are UUIDs, you can pass the ID itself as the token: `UUID(uuidString: user.id)`.

## Identify at activation

If the user is signed in when the app starts, put their ID and token in the configuration. The SDK then creates the profile with both, without an anonymous profile first.

```swift snippet="identify-at-activation"
let configuration = XeeConfiguration
    .builder(withAPIKey: "xee_YOUR_SDK_KEY")
    .with(serverUrl: URL(string: "{{server}}")!)
    .with(customerUserId: user.id, withAppAccountToken: user.appAccountToken)
    .build()

try await Xee.activate(with: configuration)
```

`user.id` and `user.appAccountToken` stand for the values from your own account system. Never hardcode the customer user ID: every install would share one profile.

This only works this way on a device where the SDK has no profile yet, such as the first launch after install. If the device already has a profile from an earlier launch, the SDK keeps that profile and the rules in **Identify after login** below apply.

## Identify after login

When the user signs in or signs up after the app has started, call `Xee.identify(_:withAppAccountToken:)`.

```swift title="async/await" snippet="identify-after-login-async"
do {
    try await Xee.identify(user.id, withAppAccountToken: user.appAccountToken)
} catch {
    // error is a XeeError
}
```

```swift title="Completion handler" snippet="identify-after-login-completion"
Xee.identify(user.id, withAppAccountToken: user.appAccountToken) { error in
    if let error {
        // handle the XeeError
    }
}
```

What happens depends on the ID:

- **An ID Xee has not seen:** it is attached to the current anonymous profile, which becomes the customer's profile. The token you pass is stored as the profile's token, unless the profile has already bought something: then it keeps its token, so those purchases stay matched, and still takes the ID.
- **An ID that already belongs to another profile:** the SDK switches to that profile, the one the customer had on their other devices. Anything the anonymous profile on this device bought stays on that anonymous profile. It is not merged into the customer's profile.
- **A token that another profile already uses:** the server refuses it and `identify` throws an error. The app keeps the profile it had. See [Troubleshooting & errors](/docs/troubleshooting).

> [!NOTE]
> Purchases made while the user was anonymous are not moved when they sign in as an existing customer. If you want a purchase to count for the customer, have the user sign in before they buy.

Wait for `identify` to finish before you call other Xee methods. Calls made while the profile is changing can fail, or land on the old profile. Afterwards, read the user's access again with `Xee.getProfile()`; see [Check subscription status](/docs/subscription-status).

## Log users out

When the user signs out, call `Xee.logout()`. The SDK then starts a new anonymous profile on this device.

```swift title="async/await" snippet="logout-async"
do {
    try await Xee.logout()
} catch {
    // error is a XeeError
}
```

```swift title="Completion handler" snippet="logout-completion"
Xee.logout { error in
    if error == nil {
        // logged out
    }
}
```

Calling `logout` while the profile is still anonymous is an error.

## Users on several devices

A user is recognised across devices only by their customer user ID, so use an ID that belongs to the account, not to the device.

| Your setup | What happens |
| --- | --- |
| Account ID and token passed at activation, on a device with no Xee profile yet | The device gets the user's existing profile, or a new one created with the token. |
| `identify` after login, with an ID Xee has not seen | The anonymous profile becomes the customer's profile and takes the token, unless it has already bought something. |
| `identify` after login, with an ID that already has a profile | The device switches to that profile. The anonymous profile's own purchases stay on it. |
| A device ID used as the customer user ID | Each device gets its own profile; a purchase unlocks access only on the profile it was made on. |
| No login at all | Profiles stay anonymous. A purchase unlocks access on the install's profile, and does not follow the user to another device. |

Keep a **Restore purchases** button on your paywall anyway: App Review expects one. See [Make purchases](/docs/make-purchases).
