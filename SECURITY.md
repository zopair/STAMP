# Security policy

STAMP is a public repository and must never contain production credentials.

## Reporting a vulnerability

Please do not publish exploitable details in a public issue. Contact the repository owner privately through GitHub's security reporting feature when it is enabled. If private reporting is unavailable, request a private contact channel without including secrets or a working exploit.

## Current deployment boundary

- GitHub Pages serves the static frontend only.
- The Cloudflare Worker and D1 database are not production-deployed until their account resources and secrets are provisioned.
- Do not treat the current frontend fingerprint receipt as an independently trusted timestamp or legal ownership certificate.
- Payment entitlements must remain inactive until a signed, idempotent payment webhook is implemented and verified.

## Secret handling

Never commit API tokens, OAuth client secrets, database credentials, signing keys, OTP values, or environment files. Use GitHub Actions secrets or the hosting provider's secret manager. Rotate any credential that is accidentally exposed.
