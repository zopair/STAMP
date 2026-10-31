# STAMP

**Your work. Your proof.**

STAMP is a lightweight digital-fingerprint product concept. The first preview focuses on one simple action: calculate a SHA-256 fingerprint for a file without uploading the file itself.

## Preview 0.1

- Arabic-first, bilingual Arabic/English responsive interface.
- Local SHA-256 fingerprint calculation using the browser Web Crypto API.
- Downloadable JSON receipt containing the file name, size, hash, and client-device timestamp.
- 100 MB preview limit.
- GitHub Actions workflow prepared to build and publish the Vite app to GitHub Pages.

## Run locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## GitHub Pages

The Vite base path is configured for this repository: `/STAMP/`.

In GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. The workflow at `.github/workflows/deploy.yml` will then publish the app after pushes to `main`.

## Important scope and trust note

This preview calculates the fingerprint in the browser. It does **not** upload files, create a GitHub evidence commit, provide an independent trusted timestamp, authenticate users, send OTP, process subscriptions, or establish legal ownership. A SHA-256 hash can help detect whether a file matches a previously recorded fingerprint, but the hash alone is not proof of authorship or legal ownership.

Those capabilities require a secure backend and explicit integrations. No credentials or secrets belong in this public repository or in browser code.

## Planned product direction

1. Secure account and GitHub App connection.
2. Server-side evidence record and verifiable commit history.
3. Independent timestamping and downloadable verification reports.
4. Account dashboard, subscriptions, and optional publishing/SEO tools.

---

STAMP — Preview 0.1
