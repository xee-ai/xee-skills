Every version of a paywall saves three things in Xee: a preview of the screen, the values you can test, and the products it sells. Claude saves them from your SwiftUI view. You review them, and change some of them, on the paywall's page in the dashboard.

## What a version saves

| Part | What it is | Who sets it | Can you change it in the dashboard |
| --- | --- | --- | --- |
| Preview | A picture of the screen as your app draws it today, built from your view's code. | Claude, with each push. | No. Ask Claude for a new version. |
| Values | The headline, button text, toggles and other variables, each with the value your code starts from. | Claude, from your view's code. | You can take a value out of testing, test it, or ship a test winner. |
| Products | The store products the paywall sells, in order. | Claude, or you. | Yes: add, swap or remove a product. |

A version never changes once it is saved. Every change saves a new version, and apps built for an older version keep getting that version.

## Save the design and values

Connect Claude to Xee first (see [Use Xee in Claude](/docs/use-xee-in-claude)), then ask in your app's project folder, for example:

*Save my paywall's design and values to Xee.*

Claude reads the paywall view and what it calls, picks the values worth testing, and shows you the preview and the list before it saves anything. The rules for values are on [Let Claude build your paywall](/docs/claude-builds-paywall#a-new-paywall-what-becomes-a-variable).

## How the preview is drawn

The preview is one iPhone screen, 390 by 844 points, with no scrolling. It shows what most users see: every value at its default, the plan that starts selected, the free-trial toggle as it starts.

To match your app, Claude reads the code the view calls, not only the view:

- **Fonts.** The font your view uses, loaded from Google Fonts, in the weights the view uses. For a custom font helper, Claude follows it to the font files your app bundles. If the font is not on Google Fonts, Claude picks the closest one and tells you.
- **Colors.** Named colors, such as your accent color, come from your asset catalog, not from a guess.
- **Buttons, cells and badges.** Shared components come from their own files: their background, corners, height and font.
- **Controls.** A toggle is drawn as an iOS switch, on or off as it starts. The selected plan keeps its border or checkmark.
- **Prices.** The prices come from your products in Xee, worked out the way your code does it (per week, savings).

The preview runs no scripts and loads nothing but Google Fonts.

> [!TIP]
> Put the preview next to your app on an iPhone. If a color, font or size is off, tell Claude which file defines it and ask for a new version.

If the screen depends on something Claude cannot read from your code, such as which product has a free trial, Claude asks you before drawing it.

## The paywall page

Open **Paywalls** and choose the paywall. The latest version shows:

- **The preview.** Each value on screen is outlined and numbered, each number in its own color.
- **Values.** The same numbers and colors, with each value's name and what it holds today. A value that is not on screen, such as a delay in seconds, is numbered after the ones that are.
- **Products.** One field per product, with its period. A value or product added in a later version appears when Claude or you save that version.

Choose a number to outline that value on the preview.

### Take a value out of testing

Choose **×** next to a value. It moves to **Not for testing**, and no test can start on it, from the dashboard or from Claude. Your app still gets the value, unchanged. Choose **Undo** to put it back. A value in a running test has no **×**.

### Change the products

- **Swap a product.** Open its field and pick another one. The list is grouped by period.
- **Remove a product.** Choose **×** next to it.
- **Add a product.** Choose **Add product** and pick one. Only your app's active products are listed.

Each change saves a new version with the same preview and values. The page does not reload: a **Saving version** badge shows until the new version is in. A running test carries on into it. Products must be in your app's catalogue first: see **Products** in the dashboard.

Older versions are read only.

## Text in other languages

Pick the languages your app offers under **App settings › Languages**. Each text value is translated once, by its words, and your app gets the translation for the language it runs in. A text with no translation shows in your source language. On a paywall's page, a tab per language shows the preview in that language and lets you edit its translations. See [Localization](/docs/localization).
