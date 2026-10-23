Xee can show each paywall's and view's text in the language your app runs in. You choose the languages; each text is translated once and reaches every paywall, view, version and test that shows it.

## Choose languages

Open **App settings** and find **App Languages**:

- **Source language**: the language your values are written in, English unless you change it. Claude writes values in it.
- **Offered in**: the languages your users can get. Choose **Add languages**, tick them in the list (popular ones first, then every language A to Z) and save.

Removing a language keeps its translations, so adding it back restores them.

Claude can fill the list from your app. Ask it to set your app's languages: it reads the languages of your String Catalog (or your Xcode project), shows you the list and saves it in Xee once you say yes. A language your app has that Xee does not list is named, so you can choose the closest one.

## Which language a user gets

Your app asks for the language it runs in, the one iOS picked from the user's settings among the languages your app supports. Xee answers with the closest offered language:

| The app runs in | You offer | The user gets |
| --- | --- | --- |
| French (Canada) | French, French (Canada) | French (Canada) |
| French (Canada) | French | French |
| Spanish (Mexico) | Spanish, Spanish (Latin America) | Spanish (Latin America) |
| Chinese (Taiwan) | Chinese (Simplified) | Your source language |
| German | French | Your source language |

A text with no translation in that language shows in your source language. Numbers and on/off values are the same in every language.

## Translate

On a paywall's or view's page, a tab per language shows the preview in that language, with how many of its texts are translated. In a language's tab, each text has a field for its translation; save it and users get it at once. Leave a field empty to show the source text again. Right-to-left languages (Arabic, Hebrew, Persian, Urdu and others) show right to left.

A translation belongs to the words, not to one paywall: if two paywalls say "Start free trial", one translation serves both. Change the words and the new text needs its own translation.

Claude can translate for you. When it pushes a version, it reads your app's String Catalog and offers to save the translations it finds for your languages; nothing is saved until you say yes.

## Tests

A test needs B in every language A is translated in, so users in each language see both arms in their own language. The new-test form asks for those translations, and a test cannot start without them. See [A/B tests](/docs/ab-tests).

## In your app

Read text with a default your String Catalog translates:

```swift
Text(config.string("headline", default: String(localized: "Unlock everything")))
```

A user who opens the app offline, before the paywall loads, then still sees their language. The SDK asks for the app's language by itself; pass `locale:` to `getPaywallVariant` or `getView` only to show another language.

The fallback file you download from **Products › Fallbacks** carries every offered language. Download it again after you add translations.
