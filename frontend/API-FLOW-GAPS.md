# App Builder API integration and minimal backend changes

The frontend is configured to use:
`https://17e1-202-83-17-69.ngrok-free.app/retail-service`.
All routes below are relative to that base and use `/app-builder/v1` unless noted.
The new Postman collection is the contract source. Merchant calls send the login
access token in `at`, and ngrok requests send `ngrok-skip-browser-warning: true`.

## What is connected now

| UI action | Existing API |
| --- | --- |
| Load UI fields/default theme | GET `/meta`, GET `/theme/default` |
| Save selected platforms/account answers/type | GET/PUT `/onboarding` |
| Read/refresh account access | GET `/store-accounts`; POST `/{storeType}/verify` for an existing non-invitation verified connection |
| Connect Google after explicitly granting access | POST `/store-accounts/GOOGLE_PLAY` with developerAccountId and invitedConfirmed=true |
| Connect Apple invitation | POST `/store-accounts/APPLE/invite` with teamId and invitedConfirmed=true |
| Disconnect, after user confirmation | DELETE `/store-accounts/{storeType}` |
| Read/create/update apps | GET/POST `/apps`, PUT `/apps/{appId}` |
| Select a real retail branch | GET `/branch/v1/names/{retailId}` relative to the retail-service base, outside app-builder/v1 |
| Upload/replace icon and splash | POST `/apps/{appId}/assets/{ICON\|SPLASH}`, multipart field `file` |
| Save/publish theme | PUT `/apps/{appId}/theme`, POST `/apps/{appId}/theme/publish` |
| Request test/production builds | POST `/apps/{appId}/builds` |
| Poll/fetch build details | GET `/builds/{buildId}` |
| Counts/history/filter data | GET `/builds` with retailId and pagination; frontend loads pages and applies its existing filters |
| Retry a queued dispatch | POST `/builds/{buildId}/dispatch` |
| Check selected-platform production access | GET `/apps/{appId}/store-access?platform=...` |
| Download ready artifact | The backend build's `artifactUrl`; no invented download endpoint |

The actual API paths retain their full `/app-builder/v1` prefix in api.js.
Create/update audit fields come from the configured POC user. A new frontend draft
is local until accounts are verified and the merchant saves App details; only then
is a backend app created. The returned appId/merchantKey/package/bundle identity is
used for all subsequent requests. Template selection is presently a frontend theme
starting point rather than a claimed backend template resource.

Theme publishing saves the draft before publishing. Live mode never advances build
statuses with a demo timer; it polls backend results. Failed builds remain visible
and a retry creates another attempt. Pending invitations refresh through account
listing/onboarding rather than repeatedly resubmitting an invitation. The merchant
UI never calls staff-confirmation or CI-status APIs.

## Remaining requirements, in priority order

### 1. Keep invitation setup for the smallest change; ID-only verification needs backend capability

There is no standalone Check Account endpoint in the supplied collection. The
frontend therefore says **Validate ID format**, followed by instructions and Connect.
Format validation preserves large Google IDs as strings and checks Apple's Team ID;
it does not prove that an account exists or is owned by this merchant.

For the full original ID-first chart, add an account-details check operation and a
supported verification method. A proposed path is POST
`/store-accounts/{storeType}/check`, with the ID and retail context. Return an explicit
result such as AUTHORIZATION_REQUIRED / DETAILS_CONFIRMED / INVALID_INPUT and the
supported next action. Do not report NOT_FOUND when access is missing, and do not
mark an account VERIFIED merely because an ID has valid syntax. A new route alone
cannot grant Google/Apple access. Invitation and/or another supported authorization
method is still necessary.

With the existing APIs, Connect returns INVITE_SENT. Pallet confirms access through
the existing internal Launch Console workflow. To reduce merchant waiting, backend
could automate that confirmation once actual authorization has been demonstrated.
The frontend must continue consuming the backend result rather than calling staff
confirmation itself. Pending is never treated as connected.

### 2. Supply clear invitation metadata; an existing endpoint can be extended

Configure APP_BUILDER_GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL and
APP_BUILDER_APPLE_INVITE_EMAIL on retail-service. The current adapter reads googlePlayInviteEmail/googlePlayInviteRole and
appleInviteEmail/appleInviteRole from the existing `/meta.storeAccounts` response,
with checklist detail as a compatibility fallback.
If it has no email, Connect is blocked with a configuration message; example demo
addresses are never used in real mode.

The live metadata already supplies invitation emails, roles, and verificationMode.
No new endpoint is needed for this part. More granular permissions or consoleUrl
may be added as metadata fields later. MOCK verification is displayed explicitly
and never described as proof of live Google/Apple access.

### 3. Enforce the strict flow through existing backend permissions

The supplied collection intentionally allows app creation/test work while a Google
invitation is pending. Our requested chart requires every selected platform to be
VERIFIED first. The UI adds that strict prerequisite and also respects backend
canCreateApp, canTestBuild[platform] and canPublishProduction[platform].

For the same behavior in Postman and other clients, update backend onboarding/build
permission checks. Missing permission flags must block actions. No new endpoint is
needed just to change these rules. Account revocation and changes must invalidate
release readiness. Android-only must not require Apple, and vice versa.

### 4. Persist test acknowledgement and configuration version on the backend

The collection has no “I tested this build” operation and no guaranteed configuration
revision field. The UI currently records the merchant acknowledgement locally,
scoped to API base + retailer + user + build and the current configuration. It labels
that limitation. Only builds requested with a known configuration can qualify;
older backend builds without such a revision are not assumed current.

To enforce this across browsers/users, add a small build validation operation, e.g.
POST `/builds/{buildId}/test-validation`, and return validation in build responses.
Store testedBy/testedAt/result and a server-controlled configurationVersion or hash
on both the app and build. Production should require a successful acknowledged test
for the current configuration and every selected platform, plus backend production
permission and package/store access. Locally stored acknowledgement is not sufficient
for authoritative backend enforcement.

### 5. Persist per-app setup fields through the existing app endpoints

Selected platforms, template choice and wizard step are currently browser draft
metadata. The onboarding wantsAndroid/wantsIos fields are retail-wide. To restore
per-app setup on another device, extend GET/POST/PUT app DTOs with platforms,
templateId and setupStep (or a small setup object). No new endpoint is necessary.
This is especially relevant if a retailer has different platform choices for
multiple apps. The current UI preserves each app's browser selection separately.

## Optional, outside the required minimum

- Asset removal needs a supported clear/delete operation. Replace uploads work now;
  the real UI hides the unsupported Remove action.
- Automatic store submission is not in this collection. Production build success
  means artifact ready, followed by store-console guidance. Add a separate submission
  capability only if automatic publishing becomes part of the agreed scope.
- The branch-list route is an existing RMS dependency rather than part of this
  Postman collection; it must return retailBranchNameBranchIdProjectionList.
- Google OAuth is not implemented or implied by Connect. Apple API-key upload remains
  in the API client, but is not required by the invitation-based merchant journey.

## Current connectivity and verification

Live read-only checks on the collection's 17e1 URL returned HTTP 200 / es=0 for
metadata, default theme, onboarding, store accounts, apps, branches and build history.
The previously supplied 2ddf URL still returns ERR_NGROK_3200. The new collection is
identical to the preceding collection; the active URL in its variables is the
important difference from the previously configured frontend URL.

The backend currently reports verificationMode=MOCK. Google Play is INVITE_SENT
(waiting for Pallet), while Apple is VERIFIED in mock mode. The strict Both-platform
flow therefore remains blocked until Google Play is confirmed. No live disconnects,
app creation, uploads or build requests were performed during these checks.

A subsequent check found that 17e1 had also gone offline. The earlier successful
responses establish that its read contracts work when the tunnel is running; they
do not guarantee ongoing availability. Both backend and ngrok need to remain running.

The live browser test also found missing CORS response headers for localhost:5173.
The POC now uses a Vite development proxy (`/__retail` → configured backend base).
The proxy forwards login/ngrok headers and removes the browser Origin on its
server-to-server request. This was verified against a temporary local backend.
Production uses the backend URL directly and needs the deployed RMS origin allowed.

Update the login token when it expires. retail-service must allow the Vite origin
and `at`, `ngrok-skip-browser-warning`, Content-Type, and required methods in CORS.
Contract/unit tests and intercepted browser flows verify write-operation wiring.
Actual Google/Apple authorization, uploads and build runner execution need separate
validation in the appropriate environment.
