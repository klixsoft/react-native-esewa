# API reference

```ts
import {
  pay, isEsewaInstalled, openEsewaStore, pollPaymentState,
  parseEpayData, parseEpayReturnUrl, extractEpayData,
  EsewaError, EsewaErrorCode,
} from '@klixsoft/react-native-esewa';
```

## `pay(options): Promise<EsewaPayResult>`

Starts a payment your server already booked/signed, and resolves when the user returns.

| Option | Type | Notes |
| --- | --- | --- |
| `flow` | `'intent' \| 'epay' \| 'auto'` | Default `auto`: Intent when the eSewa app is installed **and** `intent` was given, otherwise ePay. |
| `intent.deeplink` | `string` | The `deeplink` from eSewa's booking response. |
| `epay.url` | `string` | Your server URL that auto-submits the signed ePay form. |
| `epay.returnPrefix` | `string` | Deep link prefix your `success_url` / `failure_url` return to, e.g. `myapp://esewa`. Only links with this prefix end the wait. |
| `epay.openUrl` | `(url) => Promise` | Custom opener (in-app browser). Default: `Linking.openURL`. |
| `timeoutMs` | `number` | Default 15 minutes. |
| `signal` | `{ aborted: boolean }` | Set `aborted = true` to stop waiting (rejects `E_ABORTED`). |

Result:

| Field | Meaning |
| --- | --- |
| `flow` | `'intent'` or `'epay'`: what actually ran. |
| `returnUrl` | The deep link the user came back through, if any. |
| `epay` | Decoded, **unverified** ePay payload if `returnUrl` carried `data`. |

Return detection: with a `returnPrefix` (or a link) the matching deep link ends the wait. Intent, and
ePay without `returnPrefix` and without a custom opener, resolve when the app returns to the
foreground after leaving it. A custom `openUrl` resolves when its promise does or a matching link
arrives.

**The result is not proof of payment.**

## `isEsewaInstalled(): Promise<boolean>`

Android: package `com.f1soft.esewa` is installed. iOS: `esewa://` can be opened (needs
`LSApplicationQueriesSchemes`).

## `openEsewaStore(): Promise<boolean>`

Opens eSewa's Play Store / App Store page.

## `pollPaymentState(check, options?)`

Calls `check()` (your server) every `intervalMs` (default 3000) until it returns `'success'` or
`'failed'`, which it resolves with. Rejects `E_TIMEOUT` after `timeoutMs` (default 120000) or
`E_ABORTED` when `signal.aborted`. Errors thrown by `check` propagate.

## `parseEpayData(data)` / `parseEpayReturnUrl(url)` / `extractEpayData(url)`

Decode the base64 (or url-safe base64) JSON that eSewa appends as `?data=`. `parseEpayReturnUrl`
returns `undefined` when there is no `data`. Results are unverified.

## `EsewaError`

`error.code` is one of:

| Code | Meaning |
| --- | --- |
| `E_NOT_INSTALLED` | Intent flow requested but eSewa is not installed. |
| `E_OPEN_FAILED` | The app/page could not be opened. |
| `E_NO_FLOW` | `auto` had nothing usable (no `epay`, and Intent unavailable). |
| `E_TIMEOUT` | The user did not come back in `timeoutMs`. |
| `E_ABORTED` | Aborted through `signal`. |
| `E_INVALID_ARGUMENTS` | A required option was empty. |
| `E_INVALID_RESPONSE` | The ePay `data` could not be decoded. |
| `E_NOT_LINKED` | Native module missing: rebuild the app. |
