# RMS App Builder UI replica

The default frontend now runs entirely with a local demo service. It follows
[the Replit brief](REPLIT-UI-PROMPT.md) and the supplied RMS screenshots:
RMS navigation/header, App Builder toolbar, seven setup tabs, matching blue/gray
styling, form cards, and the interactive phone preview. It does not call
retail-service, Google, Apple, CI, or the legacy Node backend.

## Run

```sh
cd frontend  # if starting from the repository root
npm install
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173.
No environment variables or backend are needed for this UI iteration.

## Demo journey

The initial draft is **Untitled app 3 / Market Day**, with Android selected and
an explicitly simulated connected Google account, matching the screenshots.
In Developer accounts, choose **Try the account setup flow** to exercise the
complete Yes/No → signup-return → Check Account → invitation instructions →
explicit access acknowledgement → Connect journey. Developer IDs remain strings.
The Simulated outcome control offers deterministic failures and pending states.
Choose Happy path and check again to complete a pending connection.

Continue through app details, branding, the 30-field theme, test builds and
production checks. Both requires independent connections and current successful,
acknowledged test builds for both platforms. Editing the configuration invalidates
older release readiness. Publishing a theme is separate from creating a build.
Build downloads are actual JSON demo reports, clearly labeled; no APK/IPA is built.

Use the toolbar Back button to view app templates and create more drafts.
The left grid icon opens build history with filters, details, and downloads.
The preview supports Home, Product, Cart and Splash and responds to draft edits.

Non-sensitive progress persists in versioned browser storage for the demo retailer.
Image files stay in memory, require reselection after refresh, and trigger a browser
leave warning. To start fresh, clear this site's localStorage. Demo invitation emails
and store context are fixtures, never production credentials or real authorization.

## Architecture and later APIs

Components retain the existing React/Vite structure: `App.jsx`, `AppBuilder.jsx`,
`StoreAccounts.jsx`, `ThemeEditor.jsx`, `Preview.jsx`, and `Builds.jsx`.
`src/appBuilderService.js` selects the adapter for all screens.
`src/demo/demoService.js` owns asynchronous operations, status transitions and
permission gates; `metadata.js` contains fixtures and `validation.js` contains
ID/theme/image validation. `themeUtils.js` holds transport-independent helpers.

The existing `src/api.js` and Postman contract tests are preserved for integration,
but the default screen does not import that client. Changing `VITE_API_BASE` alone
will not enable API mode. See [UI-REPLICA.md](UI-REPLICA.md) for the integration seam
and the account-check contract gap. Staff/CI APIs must remain outside merchant UI.

Screenshot matching is based on the provided images; exact RMS component/font
parity would require the corresponding Replit source. The Replit editor's floating
“Update from main” overlay is excluded from the application.

## Verification

```sh
npm test
npm run lint
npm run build
```

Tests cover the preserved Postman contract and demo account states, stale responses,
platform gates, release readiness, build retries, storage and validation.
