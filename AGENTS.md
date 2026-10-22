This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- **Shutdown does not use Expo Router yet.** It's one screen (`App.tsx`) with overlays (show, type, emoji picker) driven by state in `src/store.ts`. Don't add routes or `src/app/` for ordinary features; add an overlay the same way.
- Expo Router comes in with one-tap start (docs/PLAN.md, Enhancements #9), because widgets, the Quick Settings tile, Shortcuts and NFC tags open the app through links such as `shutdown://signal/red`. When that happens, routes live in `src/app/`, every file there is a screen, and `_layout.tsx` files define navigators; import `Link`, `router` and `useLocalSearchParams` from `expo-router`. Docs: https://docs.expo.dev/router/introduction.md

## This project's quirks

- The web app (`web/`) is plain JavaScript, not Expo web. It shares `src/content.ts`, `phrases.ts`, `text.ts` and `tokens.ts` through `tools/build-web.mjs`, so keep those four free of React Native imports. A feature in one app usually needs the same change in the other.
- Screen readers: use `announce()` from `src/a11y.ts`, never `accessibilityLiveRegion` (Android only). Anything covering the board must hide what's under it with `hiddenFromReaders()`, because `accessibilityViewIsModal` is iOS only.
- Checks: `npx tsc --noEmit`, `npm test` and `npm run test:web` (headless Chrome, including axe-core accessibility checks).

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
