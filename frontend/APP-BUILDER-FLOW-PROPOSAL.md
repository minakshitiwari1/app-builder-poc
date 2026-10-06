# Proposed App Builder flow with minimal changes

This is a proposed product/backend contract, not a description of changes
already implemented in retail-service. It reuses the supplied Postman APIs,
existing account statuses, and existing onboarding permission fields.

## Merchant journey

1. Choose Android, iOS, or both. Only show setup for the selected platforms.
2. Ask whether the merchant has the selected developer account.
   - No: open the official store signup page. The merchant returns and confirms
     registration; the builder does not create a Google or Apple account itself.
   - Yes: collect the developer ID (Google) or Team ID (Apple).
3. Send the account details to the backend. Validate their format, save them,
   and check authorized access where the configured integration supports it.
   A valid ID alone is not proof of account ownership or publishing permission.
4. If access is missing, show the real service-account/invitation email and
   required permissions. The merchant grants access in the store console,
   confirms this in the builder, and selects Check access again.
5. Display the backend result: access pending, verified, or needs attention.
   Keep the existing staff Launch Console as the manual confirmation path.
6. When onboarding permits app creation, enter app name and store, upload
   icon/splash, customize the theme, and save or publish the theme.
7. Create a development/stage build when the backend permits it. Show the
   existing QUEUED / BUILDING / SUCCESS / FAILED progress and artifact download.
8. Before production, complete account confirmation and prepare the store
   listing/package as required by the existing app store-access API. Create a
   production build only when the backend permits it and the app-level access
   check passes. For this first version, download the artifact and upload it
   through the store console. Automatic store submission is a separate feature.

Existing invitation behavior can remain: app creation and test builds may be
enabled while access is pending; production requires confirmed account access.
The backend's returned permissions determine the UI, including exceptions.

## Reuse the APIs

All paths below are relative to the `/retail-service` base URL.

| Action | Existing endpoint | Suggested treatment |
| --- | --- | --- |
| Read form rules and invitation details | `GET /app-builder/v1/meta` | Return real configured invitation emails and verification mode. |
| Read setup and allowed actions | `GET /app-builder/v1/onboarding?retailId=...` | Single source of truth for the UI. |
| Save Yes/No, platform and account-type answers | `PUT /app-builder/v1/onboarding` | Reuse existing fields. An account-created answer is not verification. |
| Save Google developer ID / record access grant | `POST /app-builder/v1/store-accounts/GOOGLE_PLAY` | Small proposed extension described below. |
| Recheck a saved Google account | `POST /app-builder/v1/store-accounts/GOOGLE_PLAY/verify` | Attempt a supported authorized check; return its actual result. |
| Read account status | `GET /app-builder/v1/store-accounts?retailId=...` | Display returned status and lastError. |
| Staff confirms or reports an access problem | Existing `/app-builder/v1/launch/...` endpoints | Keep as the manual fallback. |
| Create app, images, theme, builds | Existing `/app-builder/v1/apps/...` endpoints | Preserve current payloads. |
| Check production access to this specific app | `GET /app-builder/v1/apps/{appId}/store-access?platform=...` | Account connection alone must not imply access to every package. |

For Apple, retain the existing invite and API-key paths. Google service-account
verification and Apple's API-key verification do not need identical mechanics.

## Small Google connection change

Currently the collection expects `invitedConfirmed=false` to return HTTP 400.
To support "enter ID first", change only that branch of the existing Google
connection endpoint:

- Save a correctly formatted developer ID with `invitedConfirmed=false` as
  `NOT_CONNECTED`. Return the saved ID and access instructions. Do not call it
  verified just because the ID is syntactically valid.
- With `invitedConfirmed=true`, retain the current `INVITE_SENT` behavior.
- Use the existing verify endpoint to check the saved account after permission
  is granted. Set `VERIFIED` only when actual access has been established. If
  the integration cannot automatically establish account-level access, keep
  `INVITE_SENT` and use the existing staff confirmation flow.
- Return actionable messages for missing permission, configuration problems,
  and failed verification. A permission failure does not establish that the
  developer account does not exist.

This changes a documented validation rule. Update the collection's
"Google without confirming the invite (400)" test to expect saved-but-unverified
state, and add a check that this state does not allow production.

Keep IDs as strings throughout requests, storage, and responses. For example,
`"9127553203398319836"` is beyond JavaScript's safe integer range.

## Backend owns progress and permissions

Reuse these onboarding response fields:

```json
{
  "stage": "WAITING_FOR_PALLET",
  "canCreateApp": true,
  "canTestBuild": { "ANDROID": true, "IOS": false },
  "canPublishProduction": { "ANDROID": false, "IOS": false }
}
```

This is an example of a Google invitation pending confirmation, not a hardcoded
frontend policy. Return the appropriate values for the real merchant state.
Enforce the same permissions inside create/build endpoints. After mutations
or Check access again, the frontend reloads store accounts and onboarding.

Do not add a new workflow engine or duplicate state store. Reuse existing
onboarding answers, account records, app records, and build statuses. Show
validation errors inline and retain merchant input so they can correct it.

## Implementation scope

Frontend: show Yes/No, collect the ID before invitation, display backend results
and access instructions, and use returned permissions for buttons. Yes/No,
signup links, and backend permission gates are already present; the ID-first
submission must be wired after the backend extension is agreed.

Backend: extend the one Google connection validation branch; support rechecking
saved IDs through the existing verify endpoint or return a clear pending state;
configure real credentials/invitation details; keep permissions consistent.

No new endpoints or status enums are required by this proposal. Automatic OAuth
connection, store account creation inside the builder, and automatic store
submission are deferred to keep this iteration small.

Google requires service-account or OAuth authorization plus Play Console
permissions: [Google Play Developer API setup](https://developers.google.com/android-publisher/getting_started).
