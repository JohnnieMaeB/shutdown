# Shutdown

Shutdown is a phone app for autistic adults who talk most days but sometimes can't: during shutdown, sensory overload or burnout. Open it, tap a phrase, and it fills the screen so someone else can read it. One more tap says it out loud.

It works offline, has no account and no AI, and keeps everything on the phone. It started as a copy of [Lexi](https://github.com/JohnnieMaeB/lexi)'s `lexi-native` app, with the journal taken out. The plan is in [docs/PLAN.md](docs/PLAN.md).

## What's in this version

| Area | Behaviour |
|---|---|
| Phrase board | Opens straight to it: no welcome screen. Five places across the top (Main, Out, Health, Work, Home), wrapping onto a second row on a phone so none are hidden, and one big tile per phrase. Main opens first. One column on a phone, two or more on wider screens. |
| Starter phrases | 12, in `src/content.ts`, such as "I'm autistic. I can't talk right now, but I can hear you." They're a starting point for testers to rewrite. |
| Show mode | A tap fills the screen with the phrase in the biggest bold type that fits, black on white (white on black in dark looks). The screen stays awake, a light buzz confirms it opened, and screen readers announce the phrase. |
| Speak | One tap in show mode, using the phone's best offline English voice. It becomes Stop while speaking. |
| Flip | Turns only the message upside down for someone across a table. The buttons stay the right way up for you. |
| Edit | Add a phrase (words plus an optional emoji) to the place you're looking at, move phrases up or down, or delete one after a confirm. Saved on the phone straight away. |
| Looks | Lexi's Warm paper looks. Match my device (the default) is Cream by day and Ember at night, and the phone's high contrast and Reduce Motion settings are followed. |

Not in this version yet: one-tap start from the lock screen or Quick Settings, type to speak, the talk signal (green, yellow, red) and a settings screen. See the plan.

## Try it in a browser

The web app in `web/` has the same board, edit mode and show mode, built on the same phrase list, rules, type size and colours as the phone app. It works with Node 18.

```bash
npm run web
```

Then open http://localhost:5173. Phrases are saved in that browser only. Speak uses the browser's own voices.

To try it on a phone on the same Wi-Fi, open `http://<this computer's IP>:5173` there. Over plain http (not localhost), browsers won't keep the screen awake in show mode; everything else works.

`npm run web` first runs `tools/build-web.mjs`, which turns `src/content.ts`, `phrases.ts`, `text.ts` and `tokens.ts` into `web/lib/*.js` (not committed). Edit the `.ts` files, never `web/lib/`.

## Run the phone app

1. Install **Node 22.13 or newer**. Expo SDK 58 doesn't run on Node 18.
2. `npm install`
3. `npx expo start`, then scan the QR code with **Expo Go** (SDK 58). Everything in this version works in Expo Go; no development build is needed.

On Windows, keep the project at a short path such as `C:\dev\shutdown`. The Hermes compiler can't be launched from paths longer than 260 characters.

## Check it

```bash
npx tsc --noEmit
```

```bash
npm test
```

`npm test` runs `tools/test-logic.mjs` on plain Node (18 or newer): the phrase list rules, the show screen's type size, the emoji helpers, the colour contrast of every look, and a check that the web build loads.

## Files

| File | What it does |
|---|---|
| `App.tsx` | The shell: top bar with Edit, the place bar, the board, show mode on top |
| `src/components/Board.tsx` | Place switcher, phrase tiles, edit controls |
| `src/components/ShowScreen.tsx` | Show mode, Speak, Flip, Done |
| `src/components/Inputs.tsx` | Text box and the new-phrase card |
| `src/components/Overlays.tsx` | Emoji picker and toast |
| `src/phrases.ts` | Add, remove, move and load-check the phrase list (no React Native, tested) |
| `src/store.ts` | State and on-phone storage (expo-sqlite key-value store) |
| `src/speech.ts` | Voice ranking and speaking (from Lexi) |
| `src/theme.ts`, `src/tokens.ts` | Type, spacing and colours (from Lexi), plus the show colours |
| `src/text.ts` | Emoji helpers and the show screen's type size |
| `tools/make-icons.mjs` | Draws the line icons as PNGs: `node tools/make-icons.mjs` |
| `web/index.html`, `web/app.js`, `web/style.css` | The web app |
| `tools/build-web.mjs`, `tools/serve-web.mjs` | Build the web app's shared logic, and serve `web/` on port 5173 |

The app icon and splash are still Lexi's and need replacing.
