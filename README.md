# STAMP — Digital evidence workspace

STAMP is being developed as a product for creating and managing verifiable digital evidence records.

## Current repository state

### Published frontend
- Cyberpunk / glassmorphism design system with responsive Arabic-first interface and English toggle.
- Main landing page, local SHA-256 fingerprint tool, three subscription tiers, and account/dashboard screens.
- The browser fingerprint tool does not upload file contents.
- Account UI calls a real API and deliberately refuses fake OTP or fake payment confirmation when the API is not configured.

### Backend foundation added
- Cloudflare Worker + Hono API in `worker/index.ts`.
- Cloudflare D1 initial schema in `worker/migrations/0001_initial.sql`.
- Email OTP through Resend and WhatsApp OTP through the official Meta WhatsApp Cloud API.
- Hashed OTP storage, 10-minute expiry, per-email/phone/IP request throttling, a five-attempt verification ceiling, atomic one-time code consumption, hashed opaque sessions, and D1-backed account lookup.
- Binance Pay checkout via the official Merchant API, with server-side HMAC request signing and RSA/SHA-256 webhook verification.
- InstaPay direct-transfer orders in EGP at a fixed 55 EGP/USD rate, with recipient data stored as a server secret, copy-only delivery to the authenticated payer, transfer-reference submission, and an authenticated internal review endpoint.
- Binance subscription activation occurs only after a signed, amount-matched PAY_SUCCESS webhook. InstaPay activation occurs only after an administrator approves the submitted transfer reference.
- Payment provider credentials and recipient details are server secrets; never place them in Vite environment variables or frontend code.
- GitHub repository provisioning, server-side evidence commits, independent trusted timestamping, and SEO/video generation are not yet implemented.


## Direct payment methods

The subscription page offers two payment actions per plan:

- **Binance Pay (USDT):** the backend creates a merchant checkout order using the official Binance Pay API. The browser receives only the Binance checkout URL, not a recipient UID. Configure the merchant API key/secret and webhook public key as server-side secrets. The subscription is activated only after the signed Binance webhook is verified and the received amount/currency matches the pending order.
- **InstaPay (EGP):** the backend calculates EGP at the fixed rate of **55 EGP per USD** (monthly 275 EGP, yearly 2,750 EGP, lifetime 5,500 EGP). The signed InstaPay QR payment URL is stored only in the backend secret INSTAPAY_PAYMENT_LINK; it is returned only to the authenticated payer after they create an InstaPay order and is never rendered as text. The page offers a copy action, then asks for the transfer reference. The order remains submitted until an administrator checks the actual incoming transfer and approves it.

### Required server secrets

Configure these as Worker secrets (not repository variables and never VITE_*):
- BINANCE_PAY_API_KEY
- BINANCE_PAY_SECRET_KEY
- BINANCE_PAY_PUBLIC_KEY (the Binance Pay webhook verification public key/certificate)
- BINANCE_PAY_WEBHOOK_CERT_SN (the matching Binance Pay webhook certificate serial)
- INSTAPAY_RECIPIENT (the recipient IPA or registered mobile number)
- ADMIN_REVIEW_SECRET (a long random secret used only by the internal InstaPay review endpoint)

Set the Binance Pay webhook URL to /api/billing/binance/webhook. Obtain merchant credentials and the webhook public key from the Binance Pay Merchant dashboard. A personal Binance UID alone is not a substitute for merchant API credentials and signed payment notifications.

### InstaPay manual review endpoint

POST /api/admin/payments/instapay/review requires the X-Admin-Review-Secret header and JSON { "orderId": "...", "approve": true|false }. Keep this secret in a trusted admin tool only; never call this endpoint from the public frontend. Approval marks the payment paid and activates the plan. Rejection leaves the subscription inactive. InstaPay does not provide a public merchant API for third-party apps to independently confirm a transfer, so the operator must verify the bank/InstaPay incoming transaction before approval. The customer-submitted reference alone is not proof of payment.

### Important

The recipient value is hidden from the public subscription page and is not included in the frontend bundle. It is intentionally delivered only to the authenticated payer's checkout request so they can copy it into InstaPay; a payer can still inspect data delivered to their own browser. Never promise that the recipient identifier is invisible to the person who must send the transfer. Do not activate subscriptions from screenshots, client-side status, or redirect URLs.

## Frontend deployment

GitHub Pages hosts only the static Vite frontend:
- https://zopair.github.io/STAMP/

GitHub Actions builds and deploys it on pushes to `main`.

## Backend deployment requirements

GitHub Pages cannot execute the Worker or securely store server credentials. The current API adapter still targets Cloudflare Worker/D1 and is not deployed. This is a legacy runtime path; it must be migrated to the approved self-hosted open-source runtime before production, rather than treating a managed Cloudflare account as a permanent required dependency. To test the existing adapter only:

1. Create a Cloudflare D1 database named `stamp-production`.
2. Replace the placeholder `database_id` in `wrangler.jsonc` with the real D1 database ID.
3. Set `SITE_ORIGIN` to the exact deployed Pages origin.
4. Apply the migration:
   ```bash
   npm install
   npm run db:remote
   ```
5. Add Worker secrets using Wrangler (never commit secrets):
   ```bash
   npx wrangler secret put SESSION_SECRET
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put EMAIL_FROM
   npx wrangler secret put META_ACCESS_TOKEN
   npx wrangler secret put META_PHONE_NUMBER_ID
   npx wrangler secret put BINANCE_PAY_API_KEY
   npx wrangler secret put BINANCE_PAY_SECRET_KEY
   npx wrangler secret put BINANCE_PAY_PUBLIC_KEY
   npx wrangler secret put BINANCE_PAY_WEBHOOK_CERT_SN
   npx wrangler secret put INSTAPAY_RECIPIENT
   npx wrangler secret put ADMIN_REVIEW_SECRET
   ```
   Legacy note: the current account OTP implementation still depends on Resend and the official Meta WhatsApp Cloud API. These are not open-source self-hosted services; migrate this authentication delivery path before claiming the full platform is independent of commercial providers. Configure and approve the WhatsApp template named `stamp_otp` only if testing this legacy adapter.
6. Deploy the Worker:
   ```bash
   npm run api:deploy
   ```
7. Build the frontend with `VITE_API_BASE_URL` set to the Worker origin and publish the new Pages build.

**Important browser-session constraint:** the current GitHub Pages origin (`github.io`) and a default Worker origin (`workers.dev`) are cross-site. Although the cookie is configured with `SameSite=None; Secure`, browsers that block third-party cookies may not persist or send the session cookie. Do not launch paid account access on this split-origin setup. Before production, use a custom domain with the frontend and API under the same site (for example, `app.example.com` and `api.example.com`) or move the frontend and API behind a same-origin Cloudflare deployment. Verify login, refresh, and logout on real mobile browsers.

Configure the Binance Pay webhook at /api/billing/binance/webhook. Do not use a browser redirect as proof of payment. InstaPay remains manual-review until the incoming transfer is verified against the bank statement.

## Plan definitions

- Monthly: USD 5 / month.
- Yearly: USD 50 / year, including the planned SEO feature.
- Lifetime: USD 100 one-time, including planned marketing description, short-video brief and platform recommendations.

SEO automation, video generation and social-platform publishing are product requirements, not currently live integrations.

## Trust and security notes

- A SHA-256 digest helps establish file integrity against a known digest; it does not independently prove authorship, legal ownership or creation time.
- The current browser receipt uses device time, not a trusted timestamp authority.
- Do not upload private source files or credentials to a public repository.
- No GitHub token, Resend key, Meta token, Binance secret, InstaPay recipient identifier, admin review secret or session secret belongs in frontend code.
- Do not advertise the platform as providing legal certification until independent timestamping, immutable evidence records and the applicable legal process have been reviewed.

## OpenTimestamps proof (GitHub Actions)

The repository includes a manual workflow at **Actions → Create OpenTimestamps proof**.

1. Calculate the original file's SHA-256 locally (the file itself is not uploaded).
2. Open the workflow and enter the 64-character digest.
3. Download the generated `stamp-ots-proof-<run-id>` artifact. It contains `evidence.txt` and `evidence.txt.ots`.
4. Verify the downloaded proof with the OpenTimestamps client: `ots verify evidence.txt.ots`.

The workflow submits only a manifest containing the digest to public OpenTimestamps calendars. The proof may initially be pending; Bitcoin confirmation is asynchronous and can take hours. Keep the downloaded artifact permanently yourself: GitHub Actions artifacts expire after 90 days by default in this workflow.

This is a maintainer-operated proof workflow, not yet a customer-facing automated feature. It proves that the submitted digest existed no later than the eventual Bitcoin anchor; it does not by itself identify the author or establish legal ownership.

## Development

```bash
npm install
npm run dev
npm run build
npm run api:dev
```

STAMP — Your work. Your proof.
