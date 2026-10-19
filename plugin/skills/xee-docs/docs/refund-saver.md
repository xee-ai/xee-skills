When a customer asks Apple for a refund, Apple asks Xee how the purchase was used before it decides. Refund saver answers those requests for you, with your preferred outcome and what Xee knows about the customer, so a well-used subscription is less likely to be refunded by default.

Refund saver works with the App Store only.

## How it works

1. A customer asks Apple for a refund of an in-app purchase.
2. Apple sends a `CONSUMPTION_REQUEST` notification to your app's notification URL. It appears on the Events page.
3. Xee replies to Apple with 200 straight away, then sends its answer to Apple's App Store Server API in the background. Sandbox requests are answered on Apple's sandbox API, production requests on the production one.
4. Apple decides. When it refunds or declines, it sends another notification, and the request's status on the Refund saver page changes.

Your preference is a suggestion. Apple makes the final decision and may refund even when you ask it to decline.

### What Xee sends to Apple

| Field | What Xee sends |
| --- | --- |
| `customerConsented` | `true`. Xee only answers for customers who agreed to share their data. |
| `refundPreference` | Your preference: grant, decline or no preference. |
| `accountTenure` | How long ago the customer's Xee profile was created, in Apple's ranges: 0 to 3 days, 3 to 10 days, 10 to 30 days, 30 to 90 days, 90 to 180 days, 180 to 365 days, or over a year. |
| `lifetimeDollarsPurchased` | The customer's total purchases in US dollars, in Apple's ranges: $0, under $50, $50 to $99, $100 to $499, $500 to $999, $1,000 to $1,999, or $2,000 and over. |
| `lifetimeDollarsRefunded` | The customer's total refunds in US dollars, in the same ranges. |
| `appAccountToken` | The app account token on the transaction, when it has one. |
| `platform` | Apple. |

Everything else Apple asks about, such as how much of the purchase was consumed, whether it was delivered, and play time, is sent as "undeclared", because Xee does not track it.

### When Xee does not answer

Xee answers each transaction once. It skips a request, and logs why on the server, when:

- Refund saver is off for the app.
- The app has no In-App Purchase key.
- Xee cannot match the transaction to a profile, or the customer has not consented. Xee matches through the app account token on the transaction. The SDK attaches the profile's token to every purchase, so this happens mainly for purchases the SDK did not start, such as promoted purchases from your App Store page. See [Identify users](/docs/identify-users).
- The same transaction was already answered.

If Apple refuses the answer (any status other than 2xx), Xee records the failure and does not try again for that transaction. If Apple cannot be reached at all, nothing is recorded, so a later request for the same transaction is answered.

## Before you start

1. **Notification URL.** Paste the notification URL from App settings, iOS SDK into App Store Connect for both Production and Sandbox, with **Version 2**. Refund requests arrive as notifications, so without it there is nothing to answer.
2. **Bundle ID.** Check the **Bundle ID** in App settings, iOS SDK. Xee signs its answer for that bundle.
3. **In-App Purchase key.** In App Store Connect, go to Users and Access, Integrations, In-App Purchase and generate a key. Add it in [Settings, Apple keys](/settings?tab=keys) with its Issuer ID, Key ID and `.p8` file, then choose it for the app in App settings, Apple keys, under **In-App Purchase**. Xee signs every answer to Apple with this key. It is the same key Xee uses to check purchases with Apple when the SDK reports one, so if purchases already unlock, it is set. With Claude connected, `list_apps` shows `in_app_purchase_key: true`.
4. **Privacy policy.** Say in your privacy policy that you may share purchase information with Apple when a customer asks for a refund. That disclosure is yours to make, not Xee's.
5. **Consent.** Ask customers for consent in your app and report their answer with the SDK, as below. Xee sends nothing for a customer who has not said yes.

## Turn it on

1. Open **Refund saver** in your app's sidebar.
2. Choose **Turn on refund saver**.
3. Choose **Refund saver settings** to set your preference and check which In-App Purchase key is in use.

### Choose a preference

The preference in Refund saver settings applies to every customer who has not been given one of their own.

| Option | What Xee asks Apple |
| --- | --- |
| No preference: Apple decides | Nothing either way. Apple decides from its own rules and the data Xee sends. This is the default. |
| Prefer to decline refunds | To decline the refund. |
| Prefer to grant refunds | To grant the refund. |

A preference set for one customer through the SDK always wins over this default.

## Report consent and preferences from your app

Both values are stored on the customer's Xee profile, so one call each time the customer changes their mind is enough.

### Consent

Apple only accepts customer data from customers who agreed to share it. Apple recommends asking explicitly: show a prompt that explains what is shared and when, and treat no answer as no. Report the answer with `updateCollectingRefundDataConsent(_:)`:

```swift title="Swift" snippet="refund-consent-async"
do {
    // true: the customer agreed. false: the customer declined or withdrew consent.
    try await Xee.updateCollectingRefundDataConsent(true)
} catch {
    // Retry later. Until it is saved, Xee treats the customer as not consenting.
}
```

```swift title="Swift-Callback" snippet="refund-consent-completion"
Xee.updateCollectingRefundDataConsent(true) { error in
    if let error {
        print("Could not save consent: \(error)")
    }
}
```

Xee has no default for customers who never answered: without a recorded `true`, it does not answer their refund requests.

If you write your own consent text, keep it plain. For example: *"If you ask Apple for a refund of an in-app purchase, we may tell Apple how long you have had an account and how much you have spent and been refunded in the app."*

### Preference for one customer

To set the preference for the current customer, for example from a support screen, call `updateRefundPreference(_:)` with an `XeeRefundPreference`:

```swift title="Swift" snippet="refund-preference-async"
do {
    try await Xee.updateRefundPreference(.decline)
} catch {
    // Retry later.
}
```

```swift title="Swift-Callback" snippet="refund-preference-completion"
Xee.updateRefundPreference(.decline) { error in
    if let error {
        print("Could not save preference: \(error)")
    }
}
```

| Value | What Xee asks Apple for this customer |
| --- | --- |
| `.grant` | To grant the refund. |
| `.decline` | To decline the refund. |
| `.noPreference` | Nothing either way. |

Both methods need an activated SDK and apply to the current profile. Call them after `Xee.identify` when the customer signs in, so the values land on the right profile.

## Track the results

The Refund saver page shows, for the chosen time period and country:

- **Saved by Refund saver**: the amount of the requests Apple declined.
- **Refunds requested**: the amount and number of refund requests.
- **Win rate**: of the requests Apple has decided, the share it declined.

Below them, each request is listed with the customer, transaction, product, price, country, the reason the customer gave Apple, and its status:

| Status | What it means |
| --- | --- |
| Refund requested | Apple asked, and no answer from Xee has been accepted yet: Xee skipped the request (see above), Apple refused the answer, or it is still on its way. |
| Provided refund info | Apple accepted Xee's answer and has not decided yet. |
| Refunded | Apple refunded the purchase. |
| Refund declined | Apple declined the refund. |
| Refund reversed | Apple reversed an earlier refund. |

Refunds also show on the customer's profile, in User history.
