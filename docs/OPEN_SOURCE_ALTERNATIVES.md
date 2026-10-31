# STAMP — Open-source alternatives and implementation decisions

Research date: 2026-10-31

This document records alternatives checked against their upstream GitHub repositories and official documentation. "Open source" describes the software license; it does not imply free compute, free outbound email, free payment processing, or that merchant accounts can be created without the account owner.

## Decisions for the MVP

| Capability | Selected path | Why | Remaining operational dependency |
|---|---|---|---|
| Static frontend | GitHub Pages + GitHub Actions | Already connected and current Pages workflow has a successful run | GitHub Pages availability and Actions quotas |
| API runtime | Keep the small Hono API; Cloudflare Workers + D1 is the current adapter | Smaller operational footprint than a self-hosted app stack | A Cloudflare account, D1 database and Worker deployment authorization |
| Email OTP | Prefer Appwrite Auth if adopting Appwrite as the complete backend; otherwise retain the current Resend adapter | Appwrite provides email OTP, sessions and user management | Self-hosted Appwrite still needs an SMTP delivery route; a mail server must be configured and deliverability maintained |
| WhatsApp OTP | Optional second channel via the official Meta WhatsApp Cloud API | Avoids unofficial WhatsApp Web automation and account-ban/security risks | Meta business account, sender number, access token and approved authentication template |
| OTP fallback | Email-only OTP initially; optional authenticator TOTP as a second-factor alternative | The core account flow can launch without WhatsApp onboarding | TOTP enrollment/recovery flow must be implemented and tested |
| Subscription state | Keep a small first-party subscription ledger; optionally evaluate Kill Bill later | Kill Bill is capable but oversized for the first release | Real payment collection still requires an eligible gateway/merchant account |
| Egypt payment fallback | Manual transfer reference + admin review; never auto-activate on a screenshot or browser redirect | Can operate before gateway onboarding and does not need fake checkout | Owner must configure the receiving payment details and an authorized admin |
| Evidence timestamp | Manual OpenTimestamps proof workflow in GitHub Actions | Free public calendars, open proof format and Bitcoin anchoring; asynchronous confirmation | Maintainer currently submits a SHA-256 digest; customer-facing integration remains future work |
| Self-hosting option | Coolify on a VPS only if/when a server is available | Apache-2.0 self-hostable deployment control plane | Requires a Linux server, storage, backups, patching and operations |

## Repositories reviewed

### 1. OpenTimestamps — selected for evidence timestamping
- Client: https://github.com/opentimestamps/opentimestamps-client
- JavaScript implementation: https://github.com/opentimestamps/javascript-opentimestamps
- Calendar server: https://github.com/opentimestamps/opentimestamps-server
- License: LGPL-3.0-or-later for the client/library.
- The upstream client can stamp files or hashes through public calendar servers without a local Bitcoin node. Proof confirmation is asynchronous; the Bitcoin blockchain provides the eventual timestamp anchor. A proof may need a later upgrade to include the Bitcoin commitment path.
- Security rule: keep the original file private when desired; submit only its cryptographic digest. Preserve the .ots proof as a separate evidence artifact. Do not label a pending proof as Bitcoin-confirmed.
- Current implementation: `.github/workflows/ots-proof.yml` accepts a 64-character SHA-256 digest through `workflow_dispatch`, writes a digest-only manifest, stamps it with the pinned `opentimestamps-client==0.8.0`, and uploads the manifest plus `.ots` proof as a 90-day artifact. The original file is never uploaded. This is a maintainer-operated workflow; it is not yet wired into customer accounts. Pending proofs must be upgraded/verified after Bitcoin confirmation.

### 2. Appwrite — alternative all-in-one authentication/backend
- Repository: https://github.com/appwrite/appwrite
- License in repository: BSD 3-Clause.
- Official Email OTP documentation: https://appwrite.io/docs/products/auth/email-otp
- Appwrite supports passwordless email OTP and server-managed sessions. It can also provide database and storage APIs.
- Caveat: self-hosting Appwrite is a substantial service stack. Email delivery still needs SMTP configuration and reliable mail delivery. It is a viable alternative if we deliberately replace the current Hono/D1 backend; do not run two competing identity systems.

### 3. Coolify — self-hosted compute/deployment control plane
- Repository: https://github.com/coollabsio/coolify
- License: Apache-2.0.
- It deploys applications, databases and services onto infrastructure that we own (VPS, bare metal or another SSH server).
- Caveat: Coolify is not free compute. It manages a server; it does not supply one. It is the best route if a low-cost VPS becomes available and we want to own the whole stack.

### 4. Hyperswitch — payment orchestration, not a payment processor
- Repository: https://github.com/juspay/hyperswitch
- License: Apache-2.0.
- It is a substantial Rust payment orchestration stack with integrations to payment service providers.
- Decision: do not add it to the MVP. It still requires merchant/provider accounts and adds a large operational surface. Revisit only if STAMP later needs multiple payment providers and routing.

### 5. Kill Bill — subscription billing engine
- Repository: https://github.com/killbill/killbill
- License: Apache-2.0.
- It supports recurring and one-time billing, invoicing and gateway plugins.
- Decision: do not add it to the MVP. It manages billing logic but is not itself a payment gateway and still needs a gateway for real collections. Our three fixed plans can be managed with a smaller first-party subscription ledger.

### 6. listmonk — not an OTP/auth system
- Repository: https://github.com/knadh/listmonk
- License: AGPL-3.0.
- It is a self-hosted mailing-list/newsletter manager backed by PostgreSQL.
- Decision: not selected for transactional OTP. Its purpose and deployment footprint are broader than this product needs.

### 7. Official WhatsApp SDK status
- Meta's former Node.js SDK repository: https://github.com/WhatsApp/WhatsApp-Nodejs-SDK
- The repository is archived (read-only since 2023); do not add it as a new dependency.
- The current Worker uses direct HTTPS requests to the official Graph API instead. This avoids relying on the archived SDK but still requires a legitimate Meta business sender and approved template.
- Do not use unofficial WhatsApp Web libraries or session scraping as a substitute.

## Non-negotiable trust rules

1. No credentials, tokens, database passwords, or private keys in this public repository or frontend bundle.
2. No payment status changes from a success URL, uploaded screenshot alone, or unverified webhook.
3. No WhatsApp automation through unofficial web clients.
4. No claims of legal ownership certification from a Git commit or SHA-256 alone.
5. Show timestamp state honestly: locally hashed, submitted/pending, or Bitcoin-confirmed.
6. Keep the initial release narrow. Do not introduce Appwrite, Kill Bill, Hyperswitch, and Coolify simultaneously.

## Current implementation status

- Frontend redesign and Hono/Cloudflare Worker/D1 backend foundation are committed.
- The GitHub Pages workflow for commit `d9329db2b0053184e0056116a2d05ab5d07c728a` completed successfully.
- The Worker is not deployed and no D1 database is provisioned yet.
- Email, WhatsApp and Stripe credentials are not present in the repository (correctly).
- Stripe webhook verification is deliberately fail-closed; paid entitlements are not activated until a signed, idempotent webhook handler exists.
- GitHub customer-repository provisioning is still planned. A maintainer-operated OpenTimestamps digest-proof workflow is now committed; it is not yet a customer-facing integration.

## References
- https://github.com/opentimestamps/opentimestamps-client
- https://github.com/opentimestamps/javascript-opentimestamps
- https://github.com/opentimestamps/opentimestamps-server
- https://github.com/appwrite/appwrite
- https://appwrite.io/docs/products/auth/email-otp
- https://github.com/coollabsio/coolify
- https://github.com/juspay/hyperswitch
- https://github.com/killbill/killbill
- https://github.com/knadh/listmonk
- https://github.com/WhatsApp/WhatsApp-Nodejs-SDK
