# STAMP direct payment integration

## Design choices

- No new runtime or npm dependency was added. The Worker uses Web Crypto for HMAC-SHA512 request signing and RSA-SHA256 webhook verification.
- Binance Pay uses the official merchant checkout API. The merchant UID is never shipped to the browser. The backend creates an order and returns only the official checkout URL.
- InstaPay is implemented as a manual transfer workflow. The backend holds the recipient IPA/mobile identifier as a secret and sends it only to an authenticated payer after order creation; the frontend exposes a copy action but never renders the value.
- The USD plan catalog is authoritative on the server: monthly 5, yearly 50, lifetime 100. InstaPay EGP is computed server-side at 55 EGP/USD: 275, 2,750, and 5,500 EGP.
- No plan is activated by a browser redirect, screenshot, or customer-entered reference alone.

## Upstream research

### Binance Pay

- Official API documentation: https://merchant.binance.com/en/docs/functionalities/single-payment/native-apis
- Official webhook guidance: https://merchant.binance.com/en/docs/functionalities/webhooks
- Official GitHub signature examples: https://github.com/binance/binance-pay-signature-examples
- The examples repository declares MIT but explicitly warns that its sample code is not production-ready. STAMP uses the documented signing protocol with the Worker Web Crypto implementation instead of importing that sample or adding its dependencies.
- Binance Merchant API credentials and webhook certificate data must be provisioned by the account owner in the Binance Pay Merchant dashboard. A regular personal Binance account ID is not an API credential.

### InstaPay Egypt

- Official site: https://www.instapay.eg/
- Official FAQ: https://instapay.eg/?lang=en&page_id=348
- Central Bank of Egypt IPN information: https://www.cbe.org.eg/en/payment-systems-and-services/instant-payment-network
- Public documentation describes customer transfers by IPA/mobile number and collect requests, but no public merchant API for third-party websites was found in the official materials checked.
- Therefore the integration intentionally does not pretend to query InstaPay transaction status automatically. The payer submits a transfer reference; an operator verifies the incoming credit in the bank/InstaPay records and approves or rejects the order through a server-only endpoint.
- GitHub search did not identify a maintained, trustworthy official InstaPay SDK or merchant API implementation suitable for this use. No unofficial WhatsApp, screen-scraping, or reverse-engineered integration is used.

## Payment lifecycle

### Binance

1. Authenticated user selects a plan and Binance Pay.
2. Server validates plan/method, creates a unique merchant trade number, signs the API request and creates a USDT order.
3. Server stores the prepay ID and pending order; browser receives only the checkout URL.
4. Binance webhook is checked for timestamp, certificate serial and RSA-SHA256 signature.
5. Server matches merchant trade number, USDT currency and exact minor-unit amount against the pending order.
6. The order is marked paid once, and subscription activation is idempotently linked to that payment order.

### InstaPay

1. Authenticated user selects a plan and InstaPay.
2. Server computes the EGP amount and creates a pending order.
3. Server returns the recipient value only to that authenticated checkout response. The UI does not print it; it provides a copy action.
4. Customer transfers the exact amount and submits the transfer reference.
5. Order becomes submitted, not paid.
6. An authorized operator verifies the credit and calls the internal review endpoint with the admin review secret.
7. Approval marks the order paid and activates one subscription for that payment order. Rejection leaves the subscription inactive.

## Required secrets

- BINANCE_PAY_API_KEY
- BINANCE_PAY_SECRET_KEY
- BINANCE_PAY_PUBLIC_KEY
- BINANCE_PAY_WEBHOOK_CERT_SN
- INSTAPAY_RECIPIENT
- ADMIN_REVIEW_SECRET

All are server-only secrets. Never prefix them with VITE_, commit them, place them in a public Actions variable, or return them from a public configuration endpoint.

## Operational blockers before live payments

- Obtain and test a Binance Pay Merchant account, API key/secret, webhook public key and certificate serial.
- Set the webhook URL in the Binance merchant dashboard and test a signed sandbox/test payment before production.
- Confirm the correct InstaPay recipient IPA/mobile value and test a small transfer.
- Configure the internal operator tool with ADMIN_REVIEW_SECRET; keep it out of the public website.
- Apply migration 0004 before deploying the updated API.
- The API must be deployed on a real runtime with secrets. A successful static GitHub Pages deployment does not activate payments.
