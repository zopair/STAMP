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
- Stripe Checkout session creation for monthly, yearly and lifetime price IDs.
- Payment entitlements are **not activated**: the Stripe webhook currently fails closed until signature verification and event reconciliation are implemented.
- GitHub repository provisioning, server-side evidence commits, independent trusted timestamping, and SEO/video generation are not yet implemented.

## Frontend deployment

GitHub Pages hosts only the static Vite frontend:
- https://zopair.github.io/STAMP/

GitHub Actions builds and deploys it on pushes to `main`.

## Backend deployment requirements

GitHub Pages cannot execute the Worker or securely store server credentials. To activate the API:

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
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npx wrangler secret put STRIPE_PRICE_MONTHLY
   npx wrangler secret put STRIPE_PRICE_YEARLY
   npx wrangler secret put STRIPE_PRICE_LIFETIME
   ```
   Configure and approve the WhatsApp template named `stamp_otp` with a single body parameter. Meta WhatsApp Business Cloud credentials and an approved sender are required.
6. Deploy the Worker:
   ```bash
   npm run api:deploy
   ```
7. Build the frontend with `VITE_API_BASE_URL` set to the Worker origin and publish the new Pages build.

The monthly/yearly Stripe Price IDs must be recurring prices; the lifetime Price ID must be a one-time price. Configure the Stripe webhook endpoint only after its signature verification and idempotent event handler are implemented. Do not use a browser redirect as proof of payment.

## Plan definitions

- Monthly: USD 5 / month.
- Yearly: USD 50 / year, including the planned SEO feature.
- Lifetime: USD 100 one-time, including planned marketing description, short-video brief and platform recommendations.

SEO automation, video generation and social-platform publishing are product requirements, not currently live integrations.

## Trust and security notes

- A SHA-256 digest helps establish file integrity against a known digest; it does not independently prove authorship, legal ownership or creation time.
- The current browser receipt uses device time, not a trusted timestamp authority.
- Do not upload private source files or credentials to a public repository.
- No GitHub token, Resend key, Meta token, Stripe secret or session secret belongs in frontend code.
- Do not advertise the platform as providing legal certification until independent timestamping, immutable evidence records and the applicable legal process have been reviewed.

## Development

```bash
npm install
npm run dev
npm run build
npm run api:dev
```

STAMP — Your work. Your proof.
