# Changelog

## 0.1.0

- Initial release.
- eSewa **Intent** flow: detects the eSewa app and opens the booking deep link straight into it (Android + iOS).
- eSewa **ePay v2** flow: opens your server's signed form page and detects the return through a deep link.
- `pollPaymentState` helper, `parseEpayData` / `parseEpayReturnUrl` helpers and typed `EsewaError` codes.
