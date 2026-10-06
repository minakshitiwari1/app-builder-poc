# Replit implementation prompt: RMS Omnichannel App Builder

You are working in my real RMS website repository. Build a complete, functional
UI for **Omnichannel → App Builder**. This iteration is UI-first: use a coherent
mock service, and integrate real APIs later. Read this entire brief before editing.

## 1. Inspect the real project first, then implement

Inspect repository instructions, package files, existing Omnichannel routes,
the App Builder implementation if present, reusable components, design tokens,
forms, validation, notifications, API utilities, auth/retail context, state
management, and tests. Briefly identify what can be reused and the smallest
implementation approach, then proceed with implementation in the same task.

Match the actual repository's framework, JS/TS choice, routing, styles, naming,
folder conventions, and installed libraries. Extend existing App Builder files
when possible. Preserve the RMS shell, navigation, login, other Omnichannel
sections, and unrelated features. Do not create a separate app or duplicate the
RMS sidebar/header. Use a new dependency only if the existing stack cannot do it.

Our reference implementation is React + Vite with Axios. Its responsibilities
are divided among App.jsx (navigation and context), AppBuilder.jsx (wizard),
StoreAccounts.jsx (setup), ThemeEditor.jsx, Preview.jsx, Builds.jsx,
LaunchConsole.jsx (staff only), api.js (requests/response handling),
launchPermissions.js (permission access), and ui.jsx (shared primitives).
Retain these responsibilities in equivalent modules within the RMS structure;
the reference filenames do not override the real project's conventions.

## 2. Goal and scope

Merchants create their own branded Android/iOS shopping apps, connect their own
store accounts, customize branding/theme, request test builds, validate them,
and prepare a production release. App Builder lives entirely inside RMS.

Build working interactions, not only static screens. Every button must perform
its stated action, navigate, or explain an unavailable prerequisite. Implement
loading, empty, success, validation, permission-required, and retry states.

Do not call live APIs, modify backend services, build a mobile app, create real
store accounts, perform real verification, submit real builds, or publish to a
store in this iteration. All simulated results must clearly say Demo mode.

## 3. Required journey

Follow this flow, including both branches and retries:

START → choose Android / iOS / Both → for EACH selected platform:

Do you already have a developer account?
  NO → official signup link + simple instructions → merchant registers outside
       RMS → returns → chooses “I have created my account” → enters ID.
  YES → enter developer account ID → click Check Account.

Check Account → checking → account-details check result:
  Invalid details / explicit not-found result → helpful error → edit and retry.
  Permission needed to check → explain missing authorization; do not claim the
    account does not exist. Offer access instructions and retry.
  Account details confirmed → proceed to the separate access-grant step.

Access step → show backend-provided invitation details/instructions → merchant
grants access outside RMS → clicks Connect → connecting → result:
  Missing permission / pending confirmation / connection failure → actionable
    instructions, preserve input, let merchant retry.
  Connected and verified → mark this platform complete.

When ALL selected platforms are connected and verified, enable Continue to
App Builder. Then: App details → Branding → Theme → Test build → Download and
validate → Production checks → Production build and store-upload guidance.

Android-only must never require Apple setup, and vice versa. Both must track
two independent platform states. Changing the platform selection preserves
existing account records and app drafts; deselection does not disconnect an
account. Show a summary such as “1 of 2 selected platforms connected.”

This chart's strict gate is intentional. The earlier backend collection allowed
some app/test actions while an invitation was pending. Record the stricter
backend permission requirement in the future integration notes; do not quietly
retain that earlier behavior in this UI demo.

Account details confirmed is NOT the same as authorized publishing access. A
developer ID alone grants no access. In the demo, simulate the states clearly.
In real mode, only a supported backend response can establish verification.
Never set connected=true merely because an ID looks valid or an external link
was opened. Opening signup does not prove registration was completed.

## 4. Account onboarding: minimize merchant effort

Use clear progressive sections rather than exposing every technical field at
once. Show plain-language instructions beside the relevant action.

Google Play:
- Ask Yes/No. No shows https://play.google.com/console/signup and a return action.
- Yes shows Developer account ID and Check Account. Treat IDs as strings:
  example “9127553203398319836” must never be converted into a JavaScript Number.
  If practical, accept a pasted Play Console URL and extract the ID safely.
- Once account details are confirmed, show three short access instructions:
  open Play Console → Users and permissions; copy the provided invitation
  email and apply the permissions specified by the service; invite the account
  and return to RMS to click Connect.
- Provide Copy email, Open Play Console, Connect, and Retry actions. Explain
  why access is needed in one sentence. Do not ask for the client's Google password.
- Permissions/email must come from service metadata, not scattered hardcoded text.
  If metadata is missing, show “Contact support to complete setup” and allow
  the user to copy relevant details; do not silently invent credentials.

Apple:
- Ask Yes/No, with https://developer.apple.com/programs/enroll/ for signup.
- Use the correct Team ID, not a Google-style numeric ID. Explain where to find it.
- Default to the existing invitation approach: App Store Connect → Users and
  Access → invite the supplied Apple ID with the specified permissions.
- Show Organization/Individual questions only where the selected method needs
  them. If a method is unsupported for the chosen account type, explain that
  result and offer the supported option.
- Keep the existing API-key alternative under an optional advanced section if
  present. Its Key ID, Issuer ID, optional Team ID, and .p8 upload must not add
  mandatory work to the invitation path. Never persist private keys locally.

After Connect, display the service's result rather than a generic successful
HTTP request message. Pending is not Connected. Refresh pending status through
the mock service with cleanup and an explicit Check again option; real polling
must be configurable later. Do not require repeated entry of saved details.

Do not introduce OAuth in this iteration. It is a possible later backend
integration, not an existing capability.

## 5. Builder screens and functional behavior

Reuse the RMS routing system for App Builder/Builds views and wizard steps.
Provide an app selector, Create new app, and clear return navigation. Keep the
active app and step in the route using established project conventions.

Wizard steps:
1. Platform selection.
2. Developer accounts and connections.
3. App details: app name (required, max 30 characters), existing store/branch
   selection, and save/create. Show generated merchant key, package/bundle IDs,
   and deep link in an advanced read-only summary unless editing is supported.
4. Branding: icon and splash upload, preview, replace/remove draft selection,
   and upload validation. Apply backend-shaped mock rules: PNG/JPEG, max 5 MB;
   icon square, 512–4096 px, eventual backend output 1024 px; splash max 4096 px.
   Do not claim the browser has performed backend conversion or durable upload.
5. Theme: metadata-driven groups for colors, spacing, corners, typography, and
   button/card styles. Include color input + hex value, numeric ranges, font
   options, Reset draft to defaults, Save draft, and Publish theme. Publishing
   theme does not imply a new binary build. Require confirmation before discarding
   unsaved changes. Show draft vs published theme separately.
6. Test build: choose a selected platform, DEVELOPMENT/STAGE, version, and
   artifact format. Android supports APK/AAB; iOS supports IPA. Build progress
   runs through QUEUED → BUILDING → SUCCESS/FAILED. Failed builds show a reason
   and retry. Ready builds offer the appropriate download/demo action. Let the
   merchant record “I tested this build”; identify this as their acknowledgement,
   not automated quality certification.
7. Production: checklist for platform connection, branding/theme, successful
   test build and acknowledgement for the same app/platform/configuration,
   package/store access, and service-provided production permission. Changes
   affecting the app invalidate stale readiness. Show blockers with links to
   their relevant steps. Confirm the production request to prevent accidental
   duplicate release actions.

The live preview must respond immediately to app name, draft images, and theme.
Reuse the existing phone preview; support Home, Product, Cart, and Splash if
available. On narrow screens, make preview a tab/section rather than squeezing
the form. Preview is illustrative; it does not validate a mobile build.

The theme schema has 30 fields. Use metadata fixtures rather than individually
hardcoding form logic: 12 colors (brand, brandContrast, accent, background,
surface, surfaceMuted, text, textMuted, border, success, error, warning),
5 spacing values (xs/sm/md/lg/xl), 4 radii (sm/md/lg/pill), fontFamily,
4 typography sizes (caption/body/title/heading), and 4 component values
(button.radius, button.minHeight, card.radius, card.padding).
Numeric values may legitimately be zero; preserve them when merging defaults.

Builds view: status counts, search, app/platform/environment/status filters,
pagination, empty/error/loading states, refresh, and a details drawer/page.
Show build ID, version, artifact type, timestamps, status message, download,
and retry when permitted. Failed retries create a new attempt without erasing
the old build; dispatch retry applies to eligible queued builds. Avoid assuming
that SUCCESS means the app is live in the store.

Production build success means “Production build ready.” Show Open store console
and upload guidance. Automatic store submission requires a separate capability
and API, so do not invent a real Publish-to-store action or show Live status.
Demo downloads must be labeled sample reports/assets, not installable APK/IPA
files. Provide useful downloadable demo content rather than broken example URLs.

## 6. Architecture and future integration

Use the real project's feature-module conventions. Keep these responsibilities
separate: route/page composition; focused account, branding, theme, build and
preview components; workflow hooks/state; reusable validation and ID parsing;
one service boundary; mock adapter and fixtures; isolated persistence utilities.
Do not put all screens, mock data and business rules in one component.

All asynchronous actions must call the same App Builder service interface.
Components must not import fixtures, use Axios directly, or simulate verification
with their own timeouts/booleans. Use existing state/query tools; no extra state
framework or workflow engine is needed. Request failure is distinct from account
absence. Ignore stale responses if the ID, retail, app, or platform changes.

Use a single configured mock/real adapter selection. Mock is the default now.
The mock service owns state transitions, returned statuses, validation errors,
and allowed actions, mirroring how the backend will own them later. Real adapter
support can remain a clearly marked integration seam rather than invented calls.

Keep account records scoped to retail + store type; app drafts to retail + app;
builds to app + platform/environment. Derive context from RMS auth and current
retail/branch, not a developer workspace menu or hardcoded production IDs.

Keep existing account statuses compatible: NOT_CONNECTED, INVITE_SENT,
VERIFIED, FAILED, REVOKED. Model the proposed account-details check separately
from connection status; do not present a new demo-only state as an existing API
enum. Temporary loading/error state belongs in the operation state.

Reuse onboarding answers and permission fields: wantsAndroid, wantsIos,
googleAccountCreated, appleAccountCreated, accountType, dunsNumber, stage,
steps, warnings, canCreateApp, canTestBuild[platform],
canPublishProduction[platform]. The mock returns permissions consistent with
the strict chart. In real mode, consume and enforce the agreed backend contract;
flag missing/mismatched permissions rather than silently enabling actions.

Persist non-sensitive demo progress using the existing storage pattern, with
a versioned namespace per retail/app. Preserve refresh/back navigation. Keep
uploaded .p8 files in memory only. Keep image blobs out of unbounded localStorage;
use existing suitable storage or ask users to reselect after refresh. Clean up
object URLs, timers and listeners. Warn before losing unsaved edits.

Support deterministic demo scenarios from a clearly separated developer demo
control: happy path, account check failed, permission required, connection
pending, connection failed, and build failed. Use fixtures/explicit scenario
selection, not random failures or hidden magic developer IDs. Never let the
mock state bleed into future real data.

## 7. Existing API context for later work

The reference backend is retail-service, not the legacy Node /api/builds service.
The base URL is configurable and includes /retail-service. Do not bake an ngrok
domain into components. Future App Builder responses use
{es: 0, message, statusCode: 200, data}; errors use es: 1 and message.

Known existing paths, relative to that base:
- GET /app-builder/v1/meta and /app-builder/v1/theme/default
- GET/PUT /app-builder/v1/onboarding
- GET /app-builder/v1/store-accounts
- POST /app-builder/v1/store-accounts/GOOGLE_PLAY
- POST /app-builder/v1/store-accounts/APPLE/invite or /APPLE (multipart key path)
- POST /app-builder/v1/store-accounts/{storeType}/verify
- DELETE /app-builder/v1/store-accounts/{storeType}
- GET/POST /app-builder/v1/apps; GET/PUT/DELETE /apps/{appId}
- PUT /app-builder/v1/apps/{appId}/theme; POST /theme/publish under that app
- POST /app-builder/v1/apps/{appId}/assets/{ICON|SPLASH} (multipart file)
- GET/POST /app-builder/v1/apps/{appId}/builds
- GET /app-builder/v1/apps/{appId}/store-access?platform=ANDROID|IOS
- GET /app-builder/v1/builds; GET /builds/{buildId}; POST /builds/{buildId}/dispatch
- GET /branch/v1/names/{retailId}; its response has
  retailBranchNameBranchIdProjectionList, separate from the standard data envelope.

The API prefixes in abbreviated paths above inherit /app-builder/v1. Centralize
normalization in the adapter. Retain audit fields createdBy/createdByName or
updatedBy/updatedByName from RMS context. Image multipart field is file; Apple's
key field is privateKey. Never set multipart boundaries manually.

The existing collection DOES NOT establish a standalone Check Account operation
that proves a new account exists by ID. Its Google connect endpoint requires
invitedConfirmed=true; false currently returns 400. Mock the desired ID-first
flow and document the proposed backend extension instead of pretending an
unsupported endpoint exists. Never send invitedConfirmed=true just because
the client entered an ID or clicked a generic Connect button; require the explicit
access-granted acknowledgement demanded by the agreed API.

Existing staff Launch Console and CI endpoints must remain separate from merchant
UI. Use RMS authorization for staff features. Do not expose service-account keys,
staff tokens or CI tokens in the browser. A store Connect button must not claim
to have started Google OAuth when no authorization integration exists.

## 8. Interaction quality, checks and delivery

Use the RMS design system: clear stepper, progress/status badges, concise helper
text, inline errors and appropriate notifications. Use accessible labels,
keyboard navigation, focus handling, confirmation dialogs, and buttons with
visible loading states. Prevent duplicate submissions and double-click builds.
Restore focus when closing drawers/dialogs and support Escape where appropriate.

Verify end-to-end demo paths: Android-only, iOS-only, Both with one incomplete
platform, signup-return, invalid ID then retry, permission-required then Connect,
pending then verified, failed connection then retry, save/resume draft, invalid
image then valid upload, theme save/publish/reset, successful/failed test build,
production blocked/ready, filters/details/downloads, platform switching,
browser Back/refresh, and isolation between retailers/apps. No console errors,
dead buttons, stale responses, hidden blockers, or unrelated navigation regressions.

Run the repo's appropriate build/lint checks and focused tests for state transitions,
permissions, ID string preservation, and important user interactions using the
existing test stack. Do not install a large test framework solely for this feature.

Complete the UI rather than stopping at a plan. Deliver a runnable implementation,
a concise changed-files summary, verification results, and a short integration
document listing existing vs proposed service operations, response models,
permission rules, and how the real adapter will replace mocks. Clearly identify
the UI as demo-ready, not connected to Google/Apple or production APIs.
