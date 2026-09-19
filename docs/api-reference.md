# API reference

## `processEsewaPayment(options)` / `useEsewaPayment(options)` / `createEsewaFlow(options)`

The standard entry points. `initiate` receives `{ flow }` (`intent` or `epay`, chosen from `options.flow`, default `auto`) and returns `{ deeplink?, epayUrl? }`; eSewa is then opened and `verify` is polled. Extra options: `flow`, `returnPrefix`, `openUrl`. `processEsewaPayment` resolves `{ outcome, initiation }` where `initiation.flow` is the flow that ran.

## Generic payment flow

Exported by every Klixsoft payment package with identical behaviour.

```ts
type PaymentState = 'success' | 'failed' | 'pending';
type PaymentOutcome = 'success' | 'failed' | 'cancelled' | 'timeout';
type PaymentStatus = 'idle' | 'initiating' | 'presenting' | 'verifying' | PaymentOutcome;
```

### `runPaymentFlow(options): Promise<{ outcome, initiation? }>`

| Option | Type | Notes |
| --- | --- | --- |
| `initiate` | `() => Promise<T>` | Ask your server to create the payment. |
| `present` | `(initiation: T) => Promise<unknown>` | Hand it to the gateway. |
| `verify` | `() => Promise<PaymentState>` | Ask your server for the real state. |
| `isCancelled` | `(error) => boolean` | Marks a `present` error as "user backed out" so the flow ends `cancelled`. |
| `intervalMs` | `number` | Poll delay. Default 3000. |
| `timeoutMs` | `number` | Give up waiting after this long. Default 120000. |
| `maxVerifyErrors` | `number` | Consecutive `verify` failures before the flow rejects. Default 3. |
| `signal` | `{ aborted: boolean }` | Set `aborted = true` to stop; the flow ends `cancelled`. |
| `onStatus` | `(status) => void` | Called on every step change. |

Errors from `initiate` and non-cancel errors from `present` reject. A server `failed` resolves `failed`; a payment still pending at `timeoutMs` resolves `timeout`.

### `usePaymentFlow(options)`

The same as a hook. Returns `{ start, cancel, reset, status, isProcessing, error }`. `start()` resolves with the result, or `undefined` if it failed (see `error`). The latest options are always used and a running flow is aborted on unmount.

### `parseEpayData(data)` / `parseEpayReturnUrl(url)` / `extractEpayData(url)`

Decode the base64 (or url-safe base64) JSON that eSewa appends as `?data=`. `parseEpayReturnUrl`
returns `undefined` when there is no `data`. Results are unverified.

## `EsewaError`

`error.code` is one of:

| Code | Meaning |
| --- | --- |
| `E_NOT_INSTALLED` | Intent flow requested but eSewa is not installed. |
| `E_OPEN_FAILED` | The app/page could not be opened. |
| `E_NO_FLOW` | `auto` had nothing usable (no `epay`, and Intent unavailable). |
| `E_TIMEOUT` | The user did not come back in `timeoutMs`. `error.isCancelled` is true. |
| `E_ABORTED` | Aborted through `signal`. |
| `E_INVALID_ARGUMENTS` | A required option was empty. |
| `E_INVALID_RESPONSE` | The ePay `data` could not be decoded. |
| `E_NOT_LINKED` | Native module missing: rebuild the app. |
