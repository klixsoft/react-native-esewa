# @klixsoft/react-native-esewa

Accept [eSewa](https://esewa.com.np) payments in React Native with both of eSewa's current
integrations, and **no embedded WebView**:

| Flow | What the user sees | Use it when |
| --- | --- | --- |
| **Intent** (recommended) | Your app jumps straight into the eSewa app, pays, and returns | The eSewa app is installed (most Nepali users) |
| **ePay v2** | The hosted eSewa payment page opens in the browser, then returns to your app | The user has no eSewa app, or you want the web login |

`pay({ flow: 'auto' })` picks Intent when the eSewa app is installed and falls back to ePay otherwise.

eSewa's older native SDKs are deprecated and eSewa publishes no React Native package, so this
library is deliberately small: a native module that talks to the eSewa **app** (install check and
deep link), plus TypeScript that orchestrates the flow and detects the return. Nothing proprietary
is bundled.

> **Security in one line:** eSewa payments are signed with a **secret key that must never ship in
> the app**. Your server books/signs the payment and **verifies the result with eSewa's status API**
> before granting anything. What this library returns is only "the user came back". See
> [docs/security.md](docs/security.md).

## Requirements

- React Native **0.76+** with the New Architecture enabled
- Android `minSdk` 24, iOS 13+

## Installation

```sh
pnpm add @klixsoft/react-native-esewa     # or npm / yarn
cd ios && pod install
```

### iOS: allow the install check (required)

iOS only lets an app probe for another app's URL scheme if it is declared. Add `esewa` to
`ios/<App>/Info.plist`:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>esewa</string>
</array>
```

Without it `isEsewaInstalled()` always returns `false` on iOS.

### Android

Nothing to do. The library's manifest declares `<queries><package android:name="com.f1soft.esewa" />`,
which Android 11+ requires to detect the app.

### ePay return deep link (ePay flow only)

Register a scheme for your app (for example `myapp://`) and use `myapp://esewa/success` and
`myapp://esewa/failure` as the ePay `success_url` / `failure_url` your server sends to eSewa. If
those URLs are HTTPS pages on your server, have that page redirect to the app scheme.

## How a payment works

```
 App                          Your server                       eSewa
  | 1. "buy this" ---------->  |                                  |
  |                            | 2. Intent: POST /intent/payment/book
  |                            |    ePay:   build signed form URL |
  |                            | -------------------------------> |
  |  <-- deeplink | form url - |                                  |
  | 3. pay({ intent | epay })  |                                  |
  | ----------- opens the eSewa app / hosted page ------------->  |
  |                            |  <-- callback + status API ----> |
  | 4. user returns            |                                  |
  | 5. pollPaymentState(...)  -> "did it succeed?" -> server asks eSewa
  |  <----- success / failed ---|                                 |
```

Steps 2 and 5 are yours; see [docs/backend-integration.md](docs/backend-integration.md) for the
exact requests and signing code.

## Usage

```tsx
import { pay, pollPaymentState, EsewaError, EsewaErrorCode } from '@klixsoft/react-native-esewa';

async function buy(planId: string) {
  const order = await api.post('/payments/esewa/start', { planId, returnPrefix: 'myapp://esewa' });

  try {
    await pay({
      flow: 'auto',
      intent: { deeplink: order.deeplink },
      epay: { url: order.epayUrl, returnPrefix: 'myapp://esewa' },
    });

    const outcome = await pollPaymentState(async () => {
      const { status } = await api.get(`/payments/${order.id}/status`);
      return status;
    });

    return outcome === 'success';
  } catch (error) {
    if (error instanceof EsewaError && error.code === EsewaErrorCode.NotInstalled) {
      // offer openEsewaStore() or switch to the ePay flow
    }
    throw error;
  }
}
```

`pay()` resolves when the user returns to your app. It does **not** mean the payment succeeded, so
always confirm with your server.

### Choosing the flow

```ts
await pay({ flow: 'intent', intent: { deeplink } });   // eSewa app only; throws E_NOT_INSTALLED
await pay({ flow: 'epay',   epay: { url } });          // hosted page only
await pay({ flow: 'auto', intent: {...}, epay: {...} }); // Intent if installed, else ePay
```

### Using an in-app browser for ePay

By default ePay opens the system browser. To use Custom Tabs / SFSafariViewController, pass your
own opener (for example with `react-native-inappbrowser-reborn`):

```ts
epay: {
  url,
  returnPrefix: 'myapp://esewa',
  openUrl: (u) => InAppBrowser.openAuth(u, 'myapp://esewa'),
}
```

## API

See [docs/api-reference.md](docs/api-reference.md). In short: `pay`, `isEsewaInstalled`,
`openEsewaStore`, `pollPaymentState`, `parseEpayData`, `parseEpayReturnUrl`, `EsewaError`.

## Documentation

- [Backend integration](docs/backend-integration.md): Intent booking, ePay signing, status checks (Node and Python)
- [API reference](docs/api-reference.md)
- [Security](docs/security.md)
- [Troubleshooting](docs/troubleshooting.md)

## Testing

eSewa provides sandbox credentials (see the backend guide). The Intent sandbox needs the eSewa
**test** app on the device. Pure helpers are covered by `pnpm test` (Node's built-in runner).

## Disclaimer

This is an independent, community library. It is not affiliated with or endorsed by eSewa.

## License

MIT © Klixsoft
