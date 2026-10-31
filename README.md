# STAMP — Digital evidence workspace

STAMP is being developed as a product for creating and managing verifiable digital evidence records.

## Current repository state

### Published frontend
- Cyberpunk / glassmorphism design system with responsive Arabic-first interface and English toggle.
- Main landing page, local SHA-256 fingerprint tool, three subscription tiers, and account/dashboard screens.
- The browser fingerprint tool does not upload file contents.
- Account UI calls a real API and deliberately refuses fake OTP or fake payment confirmation when the API is not configured.

### Legacy backend scaffold (not deployed; migration pending)
- Cloudflare Worker + Hono API in `worker/index.ts`.
- Cloudflare D1 initial schema in `worker/migrations/0001_initial.sql`.
- Email OTP through Resend and WhatsApp OTP through the official Meta WhatsApp Cloud API.
- The current branch includes the initial custom OTP/session implementation; PR #10 is hardening request limits, attempt ceilings, and atomic one-time consumption. Its migration is not deployed.
- Stripe Checkout session creation for monthly, yearly and lifetime price IDs.
- Payment entitlements are **not activated**: the Stripe webhook currently fails closed until signature verification and event reconciliation are implemented.
- GitHub repository provisioning, server-side evidence commits, independent trusted timestamping, and SEO/video generation are not yet implemented.

## Frontend deployment

GitHub Pages hosts only the static Vite frontend:
- https://zopair.github.io/STAMP/

GitHub Actions builds and deploys it on pushes to `main`.

## Current release boundary

The Worker is not deployed, no production D1 database is provisioned, and no provider credentials are configured. Therefore the published site is a static frontend preview; account registration, OTP delivery, billing, and customer provisioning are not live services.

The current Worker code still contains legacy adapters for Cloudflare D1, Resend, Meta WhatsApp Cloud API and Stripe. These are not approved as mandatory dependencies under the project's operating policy. Do not deploy this legacy adapter as a production service or configure paid provider accounts as the next step.

## Target self-hosted architecture

The implementation plan is documented in [Open-source operating policy and target architecture](docs/OPEN_SOURCE_ALTERNATIVES.md).

The target is deliberately small:
- Keep the existing React/Vite frontend.
- Keep Hono and port its API to standard Node.js LTS.
- Use a local SQLite database for the initial single-instance deployment.
- Keep sessions server-side, hashed, revocable and protected by atomic OTP/rate-limit logic.
- Make SMTP an optional adapter; do not require Resend or WhatsApp.
- Start subscriptions as pending and activate only after an auditable admin reconciliation of an actual bank/wallet transfer.
- Keep OpenTimestamps as an optional proof format; it is not legal ownership certification.
- Deploy the API only when an owner-controlled server or VPS is available.

GitHub Pages and GitHub Actions are not a persistent API host or production database. No always-on backend is claimed until the server, database, secrets, backups and smoke tests exist.

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
