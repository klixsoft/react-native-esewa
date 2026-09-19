# Backend integration

The device never holds your eSewa secret. Your server has two jobs: **start** the payment, and
**verify** it. This guide covers both eSewa integrations.

| | Intent | ePay v2 |
| --- | --- | --- |
| Sandbox base | `https://rc-checkout.esewa.com.np` | `https://rc-epay.esewa.com.np` |
| Live base | `https://checkout.esewa.com.np` | `https://epay.esewa.com.np` |
| Merchant code | Intent `product_code` (`INTENT` in sandbox) | `product_code` (`EPAYTEST` in sandbox) |
| Signing | HMAC-SHA256, base64, over `name=value` pairs joined by `,` | Same |
| Result to your server | `callback_url` POST + status API | `success_url` redirect + status API |

Confirm current endpoints and sandbox values against eSewa's developer docs before going live.

## Signing

Both flows sign a comma-joined list of `name=value` pairs (no spaces) with your secret key:

```js
import { createHmac } from 'node:crypto';

const sign = (secret, fields, names) =>
  createHmac('sha256', secret)
    .update(names.map((n) => `${n}=${fields[n]}`).join(','))
    .digest('base64');
```

```python
import base64, hashlib, hmac

def sign(secret, fields, names):
    message = ",".join(f"{n}={fields[n]}" for n in names)
    digest = hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()
    return base64.b64encode(digest).decode()
```

## Intent flow

### 1. Book the payment (server)

`POST {base}/api/client/intent/payment/book` with JSON:

```json
{
  "product_code": "INTENT",
  "amount": 100,
  "transaction_uuid": "order-1042",
  "signed_field_names": "product_code,amount,transaction_uuid",
  "signature": "<sign(product_code,amount,transaction_uuid)>",
  "callback_url": "https://api.example.com/webhooks/esewa",
  "redirect_url": "https://api.example.com/payments/return",
  "properties": { "customer_id": "42", "remarks": "Pro plan" }
}
```

`amount` is in **rupees** as a JSON number (`100`, `2923.86`), and it must be the same value you
signed. A successful response carries `data.booking_id`, `data.deeplink` and `data.correlation_id`.
Store `booking_id` and `correlation_id` against your order and send **only `deeplink`** to the app.

### 2. Open it (app)

```ts
await pay({ flow: 'intent', intent: { deeplink } });
```

### 3. Verify (server)

`POST {base}/api/client/intent/payment/status` with `booking_id`, `product_code`, `correlation_id`
signed over `booking_id,product_code,correlation_id`. `data.status` is one of `BOOKED`, `PENDING`,
`SUCCESS`, `FAILED`, `CANCELED`, `REVERTED`. Treat only `SUCCESS` as paid, and check that the
amount and `transaction_uuid` match your order.

To abandon a booking, `POST .../intent/payment/cancel` (signed over `booking_id,product_code`).

The `callback_url` is eSewa calling **your** server with the final status. Verify its signature
with the same secret, and still confirm with the status API.

## ePay v2 flow

### 1. Build the signed form (server)

The user's browser must `POST` a form to `{epayBase}/api/epay/main/v2/form`. Because the form
contains a signature made with your secret, your server generates it and serves it as a page that
submits itself:

```js
app.get('/payments/esewa/epay/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  const fields = {
    amount: order.amount,
    tax_amount: 0,
    total_amount: order.amount,
    transaction_uuid: order.uuid,
    product_code: process.env.ESEWA_PRODUCT_CODE,
    product_service_charge: 0,
    product_delivery_charge: 0,
    success_url: 'myapp://esewa/success',
    failure_url: 'myapp://esewa/failure',
    signed_field_names: 'total_amount,transaction_uuid,product_code',
  };
  fields.signature = sign(process.env.ESEWA_SECRET, fields, ['total_amount', 'transaction_uuid', 'product_code']);

  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v)}">`)
    .join('');
  res.type('html').send(
    `<form id="f" method="POST" action="https://rc-epay.esewa.com.np/api/epay/main/v2/form">${inputs}</form>` +
      `<script>document.getElementById('f').submit()</script>`
  );
});
```

Tell the app to open `https://api.example.com/payments/esewa/epay/<orderId>` as `epay.url`. Make
the URL single-use or otherwise bound to the logged-in user.

If `success_url` is an HTTPS page on your server, have it redirect to `myapp://esewa/success?data=...`
so the app is reopened; the app then decodes the payload with `parseEpayReturnUrl`.

### 2. Verify (server)

The `data` value eSewa appends to `success_url` is base64 JSON with `transaction_code`, `status`,
`total_amount`, `transaction_uuid`, `product_code`, `signed_field_names` and `signature`. Never
trust it as-is: verify the signature with your secret, **then** call the status API:

```
GET {statusBase}/api/epay/transaction/status/?product_code=...&total_amount=...&transaction_uuid=...
```

with `statusBase` `https://rc.esewa.com.np` (sandbox) or `https://esewa.com.np` (live). `status` is
`COMPLETE` on success (others include `PENDING`, `CANCELED`, `NOT_FOUND`, `AMBIGUOUS`, and refund
states). Grant access only for `COMPLETE` with the expected amount.

## What the app polls

Expose one endpoint that returns `success`, `failed` or `pending` for the order. It should call
eSewa's status API (or read your webhook-updated record) and never trust anything the app sends.

```ts
await pollPaymentState(async () => (await api.get(`/payments/${id}/status`)).status);
```

## Sandbox

eSewa publishes test credentials (test eSewa IDs, password and MPIN, plus test product codes and
secret). Look them up in eSewa's developer documentation; do not commit them or any live secret.
