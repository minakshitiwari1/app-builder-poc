# App Builder React Native POC

This is a minimal React Native CLI Android application. Its generated runtime and
Android configuration comes from a build snapshot; it contains no CI, database,
or GitHub credentials.

## Local Android development

Use Node 22.11+ and JDK 17, install Android SDK Platform 36, Build Tools 36.0.0,
and NDK 27.1.12297006. Then run:

```sh
npm ci
npm run prepare:local
npm start
# In a second terminal, with an emulator or device available:
npm run android
```

`prepare:local` reads the committed, generic `build-config.example.json`. It
generates ignored `src/generated/appConfig.js` and
`android/app/build-config.gradle` files.

## CI build

The GitHub workflow retrieves an authenticated build-scoped config response and
writes only its non-secret `data` object to ignored `build-config.json`. It runs
`npm run prepare:build`, which validates required values and generates runtime
source plus controlled Android Gradle settings. Finally, it runs
`./gradlew assembleRelease` and uploads the APK artifact.
