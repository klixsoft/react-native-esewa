# Security

1. **The secret key never goes in the app.** eSewa signs requests with an HMAC secret. Anything
   bundled into an app can be extracted. Keep it on your server, in your secrets store.
2. **The app's result is untrusted.** `pay()` resolving, a `success_url` deep link or a decoded ePay
   payload can all be forged by anyone who can open a URL on the device. Only your server's call to
   eSewa's status API (or a signature-verified callback) proves payment.
3. **Verify amount and identity too.** On success, check the paid amount, currency (NPR) and
   `transaction_uuid` against the order you created, and make granting idempotent so a replayed
   callback cannot grant twice.
4. **Verify callback signatures** with `hmac.compare_digest` / `timingSafeEqual`.
5. **Bind the ePay form URL to the user.** It contains a signed amount. Require the user's session
   or use a single-use token so it cannot be shared or replayed.
6. **Deep links are public.** Any app can open `myapp://esewa/success`. Never grant on receiving it.
7. **HTTPS only** for `callback_url` and any URL the user is sent to.
8. Use sandbox credentials in development and keep live secrets out of source control and logs.
