# RMS App Builder POC

The RMS-style seven-step UI now uses the supplied retail-service Postman APIs.
Live mode and demo mode share the existing UI and a single service boundary.

## Run

```sh
cd frontend
npm install
npm run dev
```

Open the Vite URL, normally http://localhost:5173. The local `.env.local` has been
configured with the requested ngrok base, retail/branch/user values, and the
collection's login token. It is git-ignored; do not commit tokens.

```dotenv
VITE_APP_BUILDER_MODE=real
VITE_API_BASE=https://17e1-202-83-17-69.ngrok-free.app/retail-service
VITE_RETAIL_ID=RET_421
VITE_BRANCH_ID=RLC_1316
VITE_ACCESS_TOKEN=<current user-service login access token>
VITE_USER_ID=dinesh
VITE_USER_NAME=Dinesh
```

Restart Vite after changing environment variables. Local development requests go
through Vite's `/__retail` proxy to the configured base URL, avoiding browser CORS
restrictions. Production builds use the backend directly and still require CORS.
Set VITE_DEV_PROXY=false only if you intentionally want direct browser requests. In real RMS, use its existing
authenticated user/token and retail context instead of POC environment values.
Only set `VITE_APP_BUILDER_MODE=demo` when you deliberately want the offline UI demo;
real connection errors never fall back to simulated success.

## Real flow

Select platforms → developer account signup/ID format validation → grant invitation
access → Connect → wait for backend VERIFIED status → save app details → upload
branding → save/publish theme → request/download/test build → production access
checks → request production build → store-console upload guidance.

The current collection has no ID-only account verification endpoint. The UI labels
its local check **Validate ID format**. A developer ID does not grant authorization.
INVITE_SENT is pending; use Refresh status after Pallet confirmation. The original
chart's strict all-selected-platforms verification gate is applied alongside backend
permission flags. Simulated outcomes, demo downloads and CI/staff controls are hidden.

App drafts start locally until details are saved after verification. Backend images
are restored from their URLs after refresh. Template/platform/step draft preferences
and test acknowledgements currently persist in isolated local storage; the UI labels
the test acknowledgement limitation. See the backend changes below for shared state.

## Architecture and backend gaps

`src/appBuilderService.js` selects real or demo. `src/services/retailService.js`
normalizes backend data, manages loading/errors, guards actions, handles persistence
and polls backend build states. `src/api.js` implements collection paths/payloads,
login/ngrok headers, multipart uploads and envelope handling. Components retain the
existing responsibilities and RMS styling.

[API-FLOW-GAPS.md](API-FLOW-GAPS.md) maps every UI action to its API and describes the
minimal remaining backend work: optional ID-details checking, invitation metadata,
strict server permission gates, durable test validation/configuration revision, and
per-app setup fields. These are not represented as existing endpoints.

The collection's 17e1 tunnel passed live read-only checks. The earlier 2ddf tunnel
was offline. The current backend reports MOCK verification; the UI labels that
mode and does not treat it as proof of real store access. A later check found the
17e1 tunnel had also gone offline; both the backend and ngrok must stay running.
A 401 requires a current login token. If curl works but the browser fails, check CORS
for the Vite origin and `at`/`ngrok-skip-browser-warning` headers.

## Checks

```sh
npm test
npm run lint
npm run build
```

Tests cover the latest sanitized Postman contract, real adapter operations and
permissions, revision-bound build acknowledgement, pending invitations, uploads,
refresh, isolation, and the preserved demo adapter. Browser verification intercepts
API responses so it performs no live mutations.
