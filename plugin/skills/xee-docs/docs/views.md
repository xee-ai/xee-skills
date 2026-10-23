> [!NOTE] Add a view using Claude
> Connect the Xee MCP (see [Use Xee in Claude](/docs/use-xee-in-claude)), open your iOS project in Claude Code and paste this prompt:
>
> ```prompt
> Add the onboarding of this iOS app to Xee for A/B testing. Use the Xee MCP and the view-tests skill. First list my Xee apps and views, find every screen of the onboarding flow in this project, and show me a plan: the values to make testable, with today's values as defaults, the events to send with Xee.track, and the one that should judge a test. Stop after the plan. Ask me before you change the project, and again before you push the view to Xee. Never start a test. If the app is localized, read its String Catalog and offer translations for the languages my app offers in Xee; ask before saving them.
> ```

A view is a screen or a flow in your app that sells nothing, such as onboarding, a welcome tour or a permission prompt. Xee serves its values the way it serves a paywall's, so you can change them without a release and test them. A test on a view is judged by an event your app sends, such as `onboarding_finished`, not by purchases.

Claude adds views for you: ask it in your Xcode project, for example *add Onboarding for A/B test*. This page shows what the code looks like and what Xee keeps.

## Read a view

```swift title="SwiftUI" snippet="view-onboarding-swiftui"
struct OnboardingFlow: View {
    @State private var onboarding: XeeView?

    var body: some View {
        Group {
            if let onboarding {
                WelcomeScreen(config: onboarding.config)
                    .task {
                        await Xee.logShowView(onboarding)
                        Xee.time("onboarding_finished")
                        Xee.track("onboarding_started")
                    }
            } else {
                ProgressView()
            }
        }
        .task { onboarding = await Xee.getView("onboarding") }
    }
}

struct WelcomeScreen: View {
    let config: XeePaywallConfig

    var body: some View {
        VStack(spacing: 16) {
            Text(config.string("welcome_title", default: String(localized: "Trade smarter")))
                .font(.largeTitle.bold())
            if config.bool("show_skip", default: true) {
                Button("Skip") { Xee.track("onboarding_skipped") }
            }
        }
    }
}
```

`Xee.getView(_:locale:loadTimeout:)` never throws. It asks for the language your app runs in; see [Localization](/docs/localization). When the view cannot load in time (no network at first launch, no version pushed yet), it returns a view whose values are all the code's defaults, so your screens always show. `loadTimeout` defaults to 2 seconds for views, because onboarding often runs at first launch; it cannot be less than 1.

Read each value with the default your code would use without Xee: `config.string`, `config.int`, `config.double`, `config.bool` and `config.stringList`, the same types as a paywall's values. A list of screen IDs lets you test the order or the number of screens:

```swift snippet="view-screen-order"
let order = view.config.stringList("screen_order", default: ["welcome", "goals", "notifications"])
```

## Log the view

Call `Xee.logShowView(_:)` once, when the first screen appears. A test counts a user from that moment: without it, every arm has no viewers. It never throws, and for a view that could not load it does nothing (that user is not part of a test).

## Events

The view's code sends events with `Xee.track`, for example when each screen appears and when the flow ends. See [Track events](/docs/track-events). Each version of a view **declares** the events its code sends, in order. In the dashboard they make the view's funnel, and a test on the view is judged by one of them, its **goal**.

## Versions

Like a paywall, a view has versions. `XeePaywalls.json` in your app lists the version each build was made for, views and paywalls together: `{ "main": 4, "onboarding": 2 }`. An older build gets its own version's values; the latest version gets the running test. A view and a paywall cannot share an ID.

## What Claude sends

Claude pushes a version with the `push_view_version` tool:

| Field | Rule |
| --- | --- |
| `html` | A static preview of every screen: one `<section data-xee-screen="welcome">` per screen (1 to 20, IDs in snake case, each once), with `data-xee="key"` on each element that shows a value. The dashboard shows the screens side by side, each one iPhone screen. |
| `variables` | Key, type and default, as for a paywall: `string`, `int`, `double`, `bool`, `string_list`. |
| `events` | 1 to 30 steps, in funnel order. Each has `event` (the name the code sends), an optional `match` of up to 3 properties that narrows it (for example `{ "screen": "goals" }`), and a `label` of 1 to 60 characters for the dashboard. One step may have `"goal": true`: new tests on the view are judged by it unless you pick another goal; without it, by the last step. |
| `products` | None. A view has no products. |

A running test carries on into a new version by the same rules as a paywall's (see [A/B tests](/docs/ab-tests)), and it also stops when the new version no longer declares its goal.
