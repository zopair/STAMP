# STAMP — Open-source operating policy and target architecture

Research date: 2026-10-31

## Binding operating policy

STAMP must prefer auditable, self-hostable open-source components. Before adopting a repository, record its exact upstream, license, maintenance signals, security policy, dependency footprint, commercial-use rights, resource requirements, and migration/exit path.

Open-source code does not mean free hosting, free email delivery, free WhatsApp/SMS, free payment processing, or free Bitcoin anchoring. No provider is to become a mandatory dependency merely because its free tier exists today.

Do not add duplicate products for the same capability. Do not place production secrets in GitHub. Do not give agents unrestricted repository or deployment credentials. Changes must be isolated on branches, tested, and merged only after checks pass.

## Current repository inventory (verified from package.json and source)

| Layer | Current implementation | License / operational status | Action |
|---|---|---|---|
| UI | React 18, React DOM, Vite 5, TypeScript | OSS packages; static frontend published on GitHub Pages | Keep for MVP; no framework rewrite |
| API framework | Hono 4 | MIT; small framework | Keep Hono and move from Worker adapter to standard Node adapter |
| Runtime | Cloudflare Workers | Managed commercial runtime; current Worker is not deployed | Remove as mandatory runtime |
| Database | Cloudflare D1 | Managed database; no production DB provisioned | Move to local SQLite on one self-hosted instance |
| Email OTP | Resend HTTPS API | External commercial provider; no credentials configured | Remove as required dependency |
| WhatsApp OTP | Meta WhatsApp Cloud API | External platform, business sender and approved template required | Remove as required dependency; no unofficial WhatsApp Web automation |
| Payments | Stripe Checkout | External payment provider; webhook is deliberately fail-closed | Remove as required dependency; use audited manual transfer verification initially |
| Evidence timestamp | OpenTimestamps client workflow | Open format/client; public calendars are external infrastructure | Keep optional and label pending vs Bitcoin-confirmed accurately |
| CI | GitHub Actions | CI only, not a production API/database host | Keep for checks and static Pages deployment |
| Source control | GitHub repository | Required by the current product's customer-repository concept | Keep; use least-privilege tokens and explicit customer authorization |

The existing Worker and D1 code are a legacy adapter, not a deployed production service. The frontend is the only published component. Do not claim that signup, OTP, billing, customer repository provisioning, or the API is live.

## Minimal target architecture

1. **Frontend:** keep React/Vite static output and GitHub Pages while the UI remains static.
2. **API:** keep Hono; run it on supported Node.js LTS using the upstream Hono Node server adapter. No Workers-only APIs in application logic.
3. **Database:** SQLite on the same host for the first single-instance MVP. SQLite source is public domain. Use parameterized statements, explicit migrations, foreign keys, backups, and tested restore procedures. Do not put the live database file in GitHub.
4. **Sessions:** use secure opaque server-side sessions, hashed at rest, HttpOnly + Secure cookies, short-lived OTP challenges, one-time atomic consumption, rate limits, CSRF/origin controls, and session revocation. Evaluate Better Auth as a candidate before expanding custom auth; do not add it without a migration spike and tests.
5. **Verification:** no mandatory WhatsApp or SMS dependency. Email delivery can be an optional SMTP adapter. An authenticator-app TOTP factor is a provider-independent option, but it does not verify phone-number ownership. If verified phone ownership is a hard requirement, an official telecom/WhatsApp delivery provider is an unavoidable external dependency and must be explicitly approved.
6. **Billing:** first release uses a pending subscription record and manual bank/wallet transfer reference, followed by authorized admin reconciliation and an audit event. Never activate from a screenshot or success URL alone. A gateway can be added later as an optional adapter after signed webhook verification and idempotency are tested.
7. **Evidence:** hash files in the browser; do not upload originals by default. OpenTimestamps is an optional timestamping adapter. Preserve proof files and report states truthfully: local digest, submitted/pending, and Bitcoin-confirmed.
8. **Operations:** one Docker image or a plain Node process under systemd. Docker Compose is optional for local reproducibility. Coolify is optional only when a server already exists; it does not supply compute.
9. **Backups/observability:** scheduled SQLite backup with restore test, structured logs with PII/token redaction, health endpoint without secrets, and a simple process supervisor. Do not add a workflow orchestrator until there are real recurring multi-step jobs.

### Runtime boundary

A persistent API requires a machine that remains online and is reachable. GitHub Pages and GitHub Actions do not provide a permanent backend. A self-hosted server may be a VPS or hardware controlled by the owner. No runtime is being declared free until the actual resource and network path are identified.

Coolify's upstream self-hosted guide lists a minimum of 2 CPU cores, 2 GB RAM and 10 GB disk for the control plane; it still requires a server. For the small STAMP MVP, plain Node + SQLite may be lighter than installing Coolify itself.

## Candidate upstream projects — evaluated, not all selected

### Hono
- Upstream: https://github.com/honojs/hono
- License: MIT.
- Role: keep the existing framework; use the Node adapter for portability.
- Decision: selected, subject to a Node runtime integration test.

### Better Auth
- Upstream: https://github.com/better-auth/better-auth
- License: MIT (LICENSE.md).
- Repository is active and documents an Email OTP plugin with configurable attempt limits, OTP expiry, and custom delivery callback.
- Caveat: Better Auth does not deliver email itself; its OTP plugin requires a sendVerificationOTP implementation. The monorepo and plugin surface are larger than the current custom API.
- Decision: candidate only. Compare a small SQLite + Hono integration against the hardened existing session flow before choosing. Do not run two identity systems.

### SQLite
- Upstream: https://github.com/sqlite/sqlite
- License: public domain.
- Role: embedded single-host database; no database server or managed account.
- Caveat: the initial architecture is single-instance. For multi-instance horizontal scaling, plan a deliberate migration to PostgreSQL and test concurrency/backups before scaling.

### Plunk
- Upstream: https://github.com/useplunk/plunk
- License: AGPL-3.0.
- Role: self-hosted email platform with transactional email and SMTP features.
- Caveat: this is an application, not a guarantee of inbox delivery. It still needs a properly configured outbound mail path, domain DNS, reputation and operational monitoring. AGPL obligations require review before embedding or modifying it.
- Decision: not a required dependency for MVP; SMTP is an adapter boundary.

### Stalwart SMTP
- Upstream: https://github.com/stalwartlabs/smtp-server
- License: AGPL-3.0-or-later, with a separate commercial licensing offer noted upstream.
- Role: self-hosted SMTP server.
- Caveat: running an MTA does not guarantee deliverability. A sending domain, SPF, DKIM, DMARC, reverse DNS, a stable IP, reputation management and abuse handling are still needed.
- Decision: do not operate our own mail server until we have infrastructure and mail-operations capacity.

### Coolify
- Upstream: https://github.com/coollabsio/coolify
- License: Apache-2.0.
- Role: self-hosted deployment control plane.
- Caveat: it manages infrastructure that we own; it does not provide free compute. Its upstream guide lists 2 CPU cores, 2 GB RAM and 10 GB disk as minimum control-plane requirements.
- Decision: optional future operator tool, not a dependency of the app.

### Bun
- Upstream: https://github.com/oven-sh/bun
- License: Bun is MIT; its license notice also documents bundled third-party components and their licenses.
- Role: possible JS runtime and package manager.
- Decision: do not change runtime from Node for the MVP. Prefer the mature Node compatibility path; revisit only if measured resource or performance benefits justify it.

### OpenTimestamps
- Upstream client: https://github.com/opentimestamps/opentimestamps-client
- License: LGPL-3.0-or-later.
- Role: open timestamp proof client and format.
- Caveat: public calendar availability and eventual Bitcoin anchoring are external dependencies. Confirmation is asynchronous and may require proof upgrade.
- Decision: keep as an optional evidence feature, not a claim of legal ownership certification.

## External-service policy

| Capability | Open-source-only position | Honest limitation |
|---|---|---|
| Email OTP | SMTP adapter; optional self-hosted MTA | Deliverability requires domain/network operations; software cannot make outbound email free or trusted |
| WhatsApp OTP | No OSS-only official route | Official WhatsApp delivery depends on Meta's platform/business onboarding; unofficial web automation is rejected |
| SMS OTP | No OSS-only carrier route | Requires a telecom/SMS provider or direct carrier arrangement |
| Payment collection | Manual transfer + admin reconciliation | Not instant automated collection; admin must reconcile actual incoming funds |
| Always-on hosting | Owner-controlled server | Hardware, electricity, bandwidth or VPS cost still exists |
| Trusted timestamp | OpenTimestamps client and public calendar or self-hosted calendar | Bitcoin/network fees and confirmation latency remain |

## Security and release gates

- All OTP request counters must be atomic under concurrent requests.
- Wrong OTP attempts must be bounded and the successful OTP must be consumed atomically once.
- Sessions must be opaque, stored as hashes, revocable, and never exposed to browser JavaScript.
- Public worker/API responses must not expose private tokens, original files, or internal secrets.
- Payment activation requires an auditable admin decision or a verified, idempotent gateway event.
- Migrations must be applied to a disposable local database in CI before merge.
- Build, typecheck, dependency audit, CodeQL, migration validation and API security tests must pass.
- Never merge a branch with cancelled, missing, or failing required checks.
- Never describe a feature as deployed until its runtime, database, secrets and smoke tests are confirmed.

## Next implementation sequence

1. Finish and verify PR #10's atomic OTP and migration changes.
2. Add a dependency inventory and a Node/SQLite compatibility spike on a separate branch; do not replace the live static frontend.
3. Port only the existing Hono routes to Node and add migration/auth integration tests.
4. Replace Resend/Meta/Stripe as mandatory dependencies with SMTP-optional verification and manual audited subscription reconciliation.
5. Add Docker/systemd deployment files and a backup/restore runbook.
6. Deploy only after an actual server is available; until then, retain static preview and state the backend is not live.
