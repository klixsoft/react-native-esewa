# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

### Added
- `processEsewaPayment`, `useEsewaPayment` and `createEsewaFlow`: `initiate`, open eSewa, `verify`.
- eSewa **Intent** flow: detects the eSewa app and opens the booking deep link directly (Android and iOS).
- eSewa **ePay v2** flow: opens the hosted page and detects the return through a deep link or app foreground.
- `flow: 'auto'` chooses Intent when the eSewa app is installed, otherwise ePay.
- `pay`, `isEsewaInstalled`, `openEsewaStore`, `parseEpayData` and `parseEpayReturnUrl`.
- `EsewaError` with stable `EsewaErrorCode` values.
- `onSuccess`, `onCancel` and `onError` callbacks on every flow; `verify` is optional where the gateway SDK reports a trustworthy result.
- Strict typing: results are a discriminated union on `outcome`; every failure is a `PaymentFlowError` with `code`, `step` and `cause`; `is...Error` guards and `get...Error` cause extractors; compile-time type tests.
- Standard payment lifecycle shared by all Klixsoft payment packages: `runPaymentFlow`,
  `usePaymentFlow`, `pollPaymentState` and the `PaymentState` / `PaymentOutcome` / `PaymentStatus` types.
