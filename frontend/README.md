# App Builder UI

React (Vite) UI for the merchant App Builder. It talks directly to
**retail-service** (`/retail-service/app-builder/v1/...`). The old Node backend
in `../backend` is no longer used by this UI.

## Run locally

```sh
cp .env.example .env.local     # then set VITE_API_BASE to your retail-service
yarn install --frozen-lockfile
yarn dev --port 5180
```

retail-service must run with the App Builder code (branch `feat/app-builder`).
Start it with `APP_BUILDER_CI_TOKEN=local-ci-token` to use the
"act as GitHub Actions" buttons on the build details screen.

## Screens

- **App Builder**: pick or create an app for the retail in the top bar, then
  1. App details (name, merchant key, package IDs; locked after the first build)
  2. Branding images (icon, splash)
  3. Theme (built from `GET /meta`; Save draft, Publish theme → live without a rebuild)
  4. Publish (platform, environment, file type, version) → creates a build
- **Builds**: counts, filters and search across the retail's apps; details per
  build, retry GitHub trigger, and local CI simulation (BUILDING / SUCCESS / FAILED).

Settings (retail ID, default branch, user) are in the top bar and kept in the
browser.
