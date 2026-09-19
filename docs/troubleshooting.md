# Troubleshooting

**`E_NOT_LINKED`**: rebuild the native app after installing (`pod install` on iOS). The library
requires the React Native New Architecture.

**`isEsewaInstalled()` is always `false` on iOS**: add `esewa` to `LSApplicationQueriesSchemes`
in `Info.plist` and rebuild.

**`isEsewaInstalled()` is `false` on Android 11+ but the app is installed**: another library or
your manifest merger removed the `<queries>` entry. Check the merged manifest contains
`com.f1soft.esewa`. The sandbox uses the same package, but test builds distributed outside the
store may use another id.

**`E_OPEN_FAILED` on Intent**: the deeplink was empty, expired, or the eSewa app refused it.
Book a fresh payment; a booking cannot be reopened after it completed or was cancelled.

**The app never resumes after paying (`E_TIMEOUT`)**:
- ePay: the `success_url` / `failure_url` must lead back to your app scheme, and `epay.returnPrefix`
  must match it. Test the link with `adb shell am start -a android.intent.action.VIEW -d "myapp://esewa/success"`
  or `xcrun simctl openurl booted "myapp://esewa/success"`.
- Intent: the app returns to the foreground; make sure nothing else consumes `AppState` changes
  before `pay()` starts waiting.

**Server says `pending` for a long time**: Intent bookings stay `BOOKED` until paid. Keep polling
for the booking's lifetime and cancel it (`/intent/payment/cancel`) when the user gives up.

**Signature errors from eSewa**: join with `,` and no spaces; sign the exact values you send
(for example the same `amount` number); check you used the secret that matches the environment.
