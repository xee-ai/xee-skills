# App Store: running the purchase

Read this for step 2 onward of the walk, after the preflight in `SKILL.md` passed. Fetch
the `sandbox-testing` page with `get_doc` and follow it for exact wording; menu names move
between iOS and App Store Connect versions. This file is the order and the traps.

Creating products in App Store Connect and wiring the SDK belong to `xee-integration`.

| Walk step | Here |
|---|---|
| 2. Notification URL, sandbox account, phone | Pick the loop, In-App Purchase key, Notification URL, Sandbox account, Phone |
| 3. Buy | Run and buy |
| 5. Restore | Restore and re-tests |
| TestFlight comes up | The TestFlight trap |

## Pick the loop first

| | StoreKit configuration file in Xcode | Sandbox account |
|---|---|---|
| Needs | a file in the project, no Apple account | the product in App Store Connect, a sandbox account |
| Reaches Xee | **no**: Apple sends no notification | yes |
| Unlocks `premium` in Xee | no | yes: right after the purchase when the app has an In-App Purchase key, otherwise after Apple's notification |
| Good for | building the paywall and purchase code | answering "does this work end to end" |

The trap is the middle row. A purchase from a configuration file never leaves the Mac and
Xee never sends it to Apple, so Events stays empty by design. Someone who tests that way and then checks the dashboard
concludes the integration is broken when it is working as documented. Use the file while
iterating; never accept it as verification.

## In-App Purchase key

With this key Xee asks Apple for the subscription's status when the SDK reports a purchase
or a restore, so `premium` turns on right away.
Without it, access waits for Apple's notification. `in_app_purchase_key` from `list_apps`
says whether it is set. If not, the user generates one in App Store Connect (Users and
Access, Integrations, In-App Purchase), adds it in the Xee dashboard under Settings, Apple
keys with its Issuer ID, Key ID and `.p8` file, and chooses it for the app in App settings,
Apple keys, under In-App Purchase. The key stays in the dashboard: never ask for the file.
A success shows on the Events page as `VERIFIED_WITH_APPLE`.

## Notification URL

Still needed even with the key: renewals, expiry, cancellation, grace period and refunds
arrive only through it while the app is closed, and without the key even the first unlock
waits for it. In the Xee dashboard copy the Notification URL from App
settings, iOS SDK. In App Store Connect, open the app, then App Information, App Store
Server Notifications. Paste it into both the Production and the Sandbox Server URL and
choose Version 2 for each. The Bundle ID in App settings, iOS SDK must match the app
exactly: Xee rejects notifications for any other bundle.

## Sandbox account

In App Store Connect: Users and Access, Sandbox, Test Accounts. The country or region
decides which products are available and the currency. The email does not need a real
inbox but cannot belong to an existing Apple Account. Use a fresh account for a first
purchase or an introductory offer: an account keeps what it bought and is not eligible
for a trial twice.

## Phone

1. Developer Mode on: Settings, Privacy & Security. The option appears only after the
   device has been connected to a Mac running Xcode.
2. Settings, Developer, Sandbox Apple Account: sign in with the sandbox account. The
   normal Apple Account stays signed in; only in-app purchases use the sandbox one.
3. Prefer a real device. The simulator can run sandbox purchases but not every sheet
   behaves the same.
4. Check the Xcode scheme has no StoreKit configuration file selected (Product, Scheme,
   Edit Scheme, Run, Options). You can also read it from the `.xcscheme` yourself.

## Run and buy

Build from Xcode with `.with(logLevel: .verbose)` so the console shows each request. Open
the paywall, buy a product, and tell the user to watch for the sheet saying it is a
sandbox purchase. Then step 4: Events (`VERIFIED_WITH_APPLE` or `SUBSCRIBED`), Profiles, `premium` after
`Xee.getProfile()`.

## The TestFlight trap

TestFlight purchases are sandbox purchases and go to the Sandbox URL. Sign in to the
sandbox account **before** the first launch. If the app was opened while signed in only to
the user's own Apple Account, purchases are tied to that account: delete the app, sign in
to the sandbox account, install again.

## Restore and re-tests

- **Restore:** delete the app, install again, sign in to the same sandbox account, tap
  restore. `Xee.restorePurchases()` should return a profile with `premium` active: with the
  In-App Purchase key Xee asks Apple again when the SDK reports the restore; without it,
  only if Apple's notifications already reached Xee for a subscription on this profile.
  On a new device or install, identify the user with the same customer user ID first, so
  the subscription is on their profile.
- **Repeat a test with the same account:** Settings, Developer, Sandbox Apple Account,
  Manage, clear its purchase history. Skipping this makes the second run behave
  differently, which reads as flakiness.
- **Renewals:** sandbox subscriptions renew on a shortened clock (a month lasts minutes),
  so renewals and expiry play out in one session. This is a testing convenience, not a
  forecast of production timing. Apple publishes the exact schedule; do not quote numbers
  from memory.
- **Sandbox never overwrites production:** a sandbox notification does not change a
  subscription that came from production, so testing on a device with a real subscription
  is safe.
