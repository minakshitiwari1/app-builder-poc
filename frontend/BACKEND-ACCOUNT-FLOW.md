# Developer account onboarding

The desired merchant flow is:

1. Ask whether the merchant already has a Google Play developer account.
2. If no, show a link to create the account in Google Play Console. After
   registration, the merchant returns and saves that they have an account.
3. If yes, collect the developer account ID as a string and request backend
   verification.
4. The backend returns the account status, any missing access requirements,
   and which actions the merchant can perform. The UI displays that result.

An ID such as `9127553203398319836` identifies an account. It does not authorize
Google API access. The backend must verify using credentials that have permission
in the merchant's Play Console, or implement an authorized OAuth connection.
If access is missing, return an actionable access-required state; do not mark
the account verified merely because its ID has a valid format.

## What the current APIs support

- `GET /app-builder/v1/onboarding` returns account answers, checklist steps,
  `canCreateApp`, `canTestBuild`, and `canPublishProduction`.
- `PUT /app-builder/v1/onboarding` saves `googleAccountCreated` and the other
  answers. Saying an account exists does not establish verification.
- `POST /app-builder/v1/store-accounts/GOOGLE_PLAY` records a developer ID and
  requires `invitedConfirmed=true` after a real invitation.
- `POST /app-builder/v1/store-accounts/GOOGLE_PLAY/verify` rechecks an already
  connected account. The collection does not describe verification of a new,
  unconnected developer ID.
- `GET /app-builder/v1/store-accounts` returns stored statuses.

All paths are relative to the configured `/retail-service` base.

The frontend now uses the saved account answer to show the connection form or
signup guidance. It reads creation/build permissions from onboarding rather
than deriving them from account labels. The current connection form retains
the invitation requirement because the existing backend requires it.

## Backend work needed for automatic verification

The retail-service developer must define an operation that accepts the retail
and developer account ID, verifies authorized access, and returns a documented
status (verified, access required, or verification failed). This can extend the
existing connect/verify APIs; a new path is not assumed by the frontend.

Return the access instructions and real service-account email when permissions
are needed, persist the result, and update onboarding permissions. Enforce those
same permissions on create/build endpoints. Keep developer IDs as strings:
19-digit IDs exceed JavaScript's safe integer range.

Real verification must use real credentials and permissions, not mock mode or
the example invitation address. The latest inspected service configuration
uses `MOCK` and `app-builder-play@example.com`; those support testing only.

Share the updated request/response contract with the frontend developer once
implemented. The frontend must then invoke that verification operation when the
merchant submits their ID, display the result, and reload onboarding permissions.

Google's prerequisites: [Google Play Developer API setup](https://developers.google.com/android-publisher/getting_started).
