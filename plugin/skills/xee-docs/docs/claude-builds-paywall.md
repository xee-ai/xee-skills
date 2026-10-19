Your paywall stays a normal SwiftUI view in your app. Xee keeps a copy of the values you might want to change without a release: the headline, the button text, which products show, whether the trial toggle is on. Claude moves those values out of the view and into Xee, and you test them from the dashboard.

> [!TIP]
> Connect Claude to Xee first: see [Use Xee in Claude](/docs/use-xee-in-claude). Then run Claude in your app's project folder.

## How a change goes

1. Claude finds the paywall with `list_paywalls`, then reads it with `get_paywall`. A paywall that does not exist yet is an error that lists the ones there are; Claude creates a new one with `create_paywall`, then pushes its first version with `base_version` 0.
2. It changes the view in your project. Every value that should be testable becomes a variable, and the value Xee holds today becomes its default in the Swift code.
3. It sends the new version with `push_paywall_version`: an HTML preview of the view, the products, and the variables.
4. The version appears on the paywall's page in the dashboard, with the preview. You can start a test on any marked value there.

Ask it in plain words, for example: *Make the paywall's button say "Start free trial" and push the new version to Xee.*

## What a version holds

| Field | What it is |
| --- | --- |
| `base_version` | The version Claude started from (0 for a new paywall). If someone pushed after it, the push is refused as out of date and nothing is saved. |
| `html` | A static preview of the view, up to 500 KB. Each element that shows a variable carries `data-xee="key"`. |
| `products` | The store product IDs the paywall offers, in order. Each must be in the app's catalogue (`list_products`). |
| `variables` | Up to 100. Each has a `key`, a `type` and a `default`. |

Variable types:

| Type | Example default |
| --- | --- |
| `string` | `"Try for FREE"` |
| `int` | `3` |
| `double` | `0.8` |
| `bool` | `true` |
| `string_list` | `["Unlimited shorts", "AI captions"]` |

A key starts with a lowercase letter and uses lowercase letters, digits and `_`, up to 40 characters: `headline`, `cta`, `show_trial_toggle`.

```json title="Example version"
{
  "app": "magicclip",
  "paywall": "main",
  "base_version": 0,
  "html": "<h1 data-xee=\"headline\">Unlock Unlimited Shorts</h1><button data-xee=\"cta\">Try for FREE</button>",
  "products": ["ai.clipy.weekly", "ai.clipy.yearly70"],
  "variables": [
    { "key": "headline", "type": "string", "default": "Unlock Unlimited Shorts" },
    { "key": "cta", "type": "string", "default": "Try for FREE" },
    { "key": "show_trial_toggle", "type": "bool", "default": true }
  ]
}
```

A push that breaks a rule is refused with every problem listed (an unknown product, a marker with no variable, a default of the wrong type, a key used twice), and nothing is saved. Claude fixes them and pushes again.

## Read the values in Swift

The app gets the values as the paywall's remote config. Decode them into a struct whose defaults are the ones Claude pushed, so the paywall still shows the right thing when Xee cannot be reached:

```swift title="SwiftUI" snippet="paywall-values-swiftui"
import Xee

struct PaywallValues: Decodable {
    var headline = "Unlock Unlimited Shorts"
    var cta = "Try for FREE"
    var showTrialToggle = true

    enum CodingKeys: String, CodingKey {
        case headline, cta
        case showTrialToggle = "show_trial_toggle"
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let d = PaywallValues()
        headline = try c.decodeIfPresent(String.self, forKey: .headline) ?? d.headline
        cta = try c.decodeIfPresent(String.self, forKey: .cta) ?? d.cta
        showTrialToggle = try c.decodeIfPresent(Bool.self, forKey: .showTrialToggle) ?? d.showTrialToggle
    }
}

@MainActor
final class PaywallModel: ObservableObject {
    @Published var values = PaywallValues()
    @Published var products: [XeePaywallVariantProduct] = []

    func load() async {
        do {
            let paywall = try await Xee.getPaywallVariant(paywallId: "main")
            if let json = paywall.remoteConfig?.jsonString.data(using: .utf8) {
                values = (try? JSONDecoder().decode(PaywallValues.self, from: json)) ?? PaywallValues()
            }
            products = try await Xee.getPaywallVariantProducts(paywallVariant: paywall)
            try? await Xee.logShowPaywallVariant(paywall)
        } catch {
            // Keep the defaults; the paywall still works offline.
        }
    }
}
```

```swift title="UIKit" snippet="paywall-values-uikit"
import UIKit
import Xee

final class PaywallViewController: UIViewController {
    private var values = PaywallValues()

    override func viewDidLoad() {
        super.viewDidLoad()
        Task {
            guard let paywall = try? await Xee.getPaywallVariant(paywallId: "main") else { return }
            if let json = paywall.remoteConfig?.jsonString.data(using: .utf8) {
                values = (try? JSONDecoder().decode(PaywallValues.self, from: json)) ?? PaywallValues()
            }
            try? await Xee.logShowPaywallVariant(paywall)
            render()
        }
    }

    private func render() {
        // Set the labels and button from `values`.
    }
}
```

> [!IMPORTANT]
> Call `logShowPaywallVariant` each time the paywall is shown. A test counts views from it, so without it a test has no numbers.

## Tests and new versions

A test runs on one variable of the latest version. When Claude pushes again:

- A test **carries on** into the new version when its variable keeps its key, type and default.
- A test **stops** when its variable is removed, renamed, changes type or gets a new default. The one exception: it carries on if the new default is the value arm A already serves. The paywall page says why a test stopped.
- To rename a variable without losing the values set in the dashboard, Claude sends the new key with `renamed_from` set to the old one. A test on it still stops, because its key changed.
- When a test ends and you apply the winner, the dashboard serves the winning value. Once Claude writes that value into the code as the new default, Xee serves the code's value again.

Claude can suggest a test with `propose_test`, but it never starts one: you start tests in the dashboard.
