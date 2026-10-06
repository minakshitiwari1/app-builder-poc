# UI replica and integration notes

## Current service boundary

Default mode is demo-only. `src/appBuilderService.js` selects the adapter used by
`App.jsx` and all feature components;
that adapter owns the workspace snapshot, subscriptions, permissions, asynchronous
operations, errors and build state changes. UI operation flags only express loading.
There is no automatic fallback from real errors to simulated success.

For live integration, replace the single export in `src/appBuilderService.js` with a real adapter
implementing the same interface used by the components. Implement its real adapter with `api.js`, populate
context/metadata from RMS and backend responses, and normalize response data into
the workspace shape. Retain existing component responsibilities and layout.
The real adapter also needs snapshot/subscription refresh behavior; it is more than
changing a base URL. Do not merge fixture state or persisted demo data into live data.

## Existing versus proposed operations

| UI operation | Backend integration |
| --- | --- |
| Metadata/default theme | Existing GET meta/theme/default; replace fixtures |
| Platform/account answers | Existing onboarding GET/PUT |
| Account listing/connect/verify | Existing store-account paths in api.js |
| Check account by newly entered ID | Proposed extension; supplied collection does not prove existence by ID |
| App create/update/list | Existing apps endpoints |
| Branch selection | Existing branch names endpoint with its separate response shape |
| Branding | Existing multipart assets/{ICON\|SPLASH}, file field |
| Theme save/publish | Existing app theme and theme/publish endpoints |
| Build create/list/details | Existing build endpoints; consume server statuses/download URLs |
| Store package access | Existing app store-access endpoint |
| “I tested this build” | Local demo operation; agree durable backend acknowledgement bound to app/platform/configuration |
| Build retry | Demo creates a new build attempt; distinguish that from existing queued-build dispatch retry |

Google connect still requires the invitation to have actually been sent and access
to have been granted. An entered ID or open console link never authorizes an account.
Invitation email/role must come from backend metadata; fixture example.com addresses
are only for this demo. Apple uses Team ID and the invitation path. Private-key and
staff/CI screens are not exposed in this merchant replica.

## Permission and state contract

Account details check is separate from connection status. Preserve store enums
NOT_CONNECTED / INVITE_SENT / VERIFIED / FAILED / REVOKED. Pending is not verified.
Demo follows the stricter requested chart: all selected accounts must be verified
before app details; saved details enable branding; both images enable theme;
published theme enables test builds; successful acknowledged current tests for every
selected platform enable production checks; store access enables production requests.

A real adapter must enforce backend canCreateApp, canTestBuild[platform], and
canPublishProduction[platform] in addition to UI prerequisites. Missing permission
responses must block actions. The earlier collection's pending-invitation behavior
needs agreement with backend before enabling this stricter live flow.

A build is bound to an app configuration revision. Relevant account, platform,
branding, details or theme edits invalidate prior test/production readiness.
Production success means a production artifact is ready, not live in a store.
Do not replace simulated checks with locally guessed real authorization.

## Reference fidelity

The four provided wizard screenshots guide shell dimensions, spacing, typography,
blue active controls, muted text, rounded form cards and phone preview. The earlier
Replit brief supplies the full journey beyond those screenshots. Screenshot-only
replication cannot verify private RMS font tokens or implementation details.

Demo context RET_82 / RLC_151 is isolated in metadata. Replace it with authenticated
RMS context for a real adapter; recreate service state when context changes to
ignore responses from the previous retail/app. The storage key is versioned and
demo-specific. Images are kept as object URLs in memory and excluded from storage.
