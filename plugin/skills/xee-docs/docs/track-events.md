`Xee.track(_:properties:)` sends an analytics event for the current user, such as `onboarding_finished`. Xee keeps it for three things: a test on a [view](/docs/views) is judged by one, a view's page shows a funnel of them, and each user's profile in the dashboard lists them.

## Send an event

```swift snippet="track-basic"
Xee.track("onboarding_started")
Xee.track("onboarding_step_viewed", properties: ["screen": "goals", "step": 2])
Xee.track("onboarding_notifications_allowed", properties: ["granted": true])
```

`track` never throws and never waits. The event is saved on the device and sent in the background with the SDK's other events, and sent again if the network fails. Events sent before `Xee.activate` are dropped.

## Time a flow

```swift snippet="track-time"
Xee.time("onboarding_finished")   // when the first screen appears
// ... the user goes through the screens ...
Xee.track("onboarding_finished")  // carries duration_ms, the milliseconds since time()
```

`Xee.time(_:)` starts a timer for an event name. The next `track` of that name carries `duration_ms`, the milliseconds since `time`, and clears the timer. Timers live in memory: a cold start forgets them.

## Rules

| Thing | Rule |
| --- | --- |
| Name | Lowercase letters, digits and `_`, starting with a letter, up to 64 characters: `onboarding_step_viewed`. A name that breaks the rule drops the event. |
| Properties | Up to 20, each a key (lowercase letters, digits and `_`, up to 40) and a value: text up to 255 characters, a whole number, a number or `true`/`false`. Write them as literals: `["screen": "goals", "step": 2]`. A property that breaks a rule is dropped on its own; past 20, the rest are dropped by key order. |
| `duration_ms` | Set by `time`; it replaces a `duration_ms` you pass. |

Name events for what happened, `<flow>_<what happened>`: `onboarding_started`, `onboarding_step_viewed` (with `screen` and `step`), `onboarding_finished`, `onboarding_skipped`, `onboarding_notifications_allowed`. Keep a name once it ships: a view's funnel and a test's goal find events by name.

## What Xee does not do

Xee keeps what tests, funnels and the profile page need. It has no user properties, no properties shared by every event, no automatic events and no analytics dashboards. If you need those, keep your analytics tool next to Xee.
