# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-05-26

A bug-fix and hardening release. No API removals. Existing imports continue to work.

### Added

- **Deep watch by default** — array mutations (`push`, `splice`, etc.) now trigger URL updates. Opt out with `{ deep: false }`.
- **Race-safe batching** — multiple `useQueryState` updates in the same tick are merged into one `router.push`/`router.replace`. Previously, simultaneous updates would race and overwrite each other.
- **Synchronous initial read** — state is parsed from the URL during `setup` instead of `onMounted`. Eliminates the initial flash of `defaultValue` and works correctly under SSR/hydration.
- **Flexible boolean parsing** — accepts `true/false/1/0/yes/no/on/off` (case-insensitive). Unknown tokens fall back to the default value.
- **Debounce cleanup on unmount** — pending debounced URL writes are cancelled when the component's effect scope disposes, so a freshly-unmounted component cannot navigate.
- **Useful error when `vue-router` is missing** — instead of a cryptic crash, throws an explanatory error from `useQueryState`.
- **`deep` option** — control whether the ref is watched deeply (`true` by default).
- **`QueryValue` type export** — for advanced typing of custom `serialize` functions.
- **Test suite** — 26 tests covering type parsing, two-way sync, batching, debouncing, deep array mutations, and unmount safety.
- **`sideEffects: false`** in `package.json` for better tree-shaking.
- **`engines: { node: ">=18" }`** declared.

### Fixed

- **Array mutations not syncing to URL** — `selectedTags.value.push('vue')` previously did nothing; now triggers a URL update (via deep watch).
- **`router.push` race condition** — two refs updating in the same tick no longer overwrite each other's query keys.
- **Initial render flash** — `defaultValue` is no longer shown for one tick before the URL value takes over.
- **State ↔ route feedback loop** — when the URL already matches the serialized state (or vice versa), the write/parse is now skipped. Prevents unnecessary navigations and possible loops for array types.
- **Default-array reference leak** — `state.value` no longer shares a reference with the user-supplied default array, so mutating the ref can never retroactively redefine "default" (which previously caused the equal-to-default → omit-from-URL check to misbehave after the first mutation).
- **NaN in number arrays** — `?ids=1&ids=abc&ids=3` now parses to `[1, 3]` instead of `[1, NaN, 3]`.
- **Silent swallowing of all `router.push` errors** — only known navigation failure types are silenced; other errors are surfaced via `console.warn`.
- **CJS build path mismatch** — `package.json` pointed at `dist/index.cjs` but tsup was emitting `dist/index.js`, breaking `require('vue-url-state')`. Tsup is now configured to emit `.cjs`, matching the `exports` map.
- **`exports` field condition order** — `types` now comes first, removing a tsup warning at build time.

### Changed

- Version bumped to `1.1.0`.
- README updated with deep-watch behavior, the empty-array caveat for number arrays, and the `deep` option.

### Migration notes

For the vast majority of users: **no action required** — just `npm install vue-url-state@latest`.

A few edge cases worth knowing:

- If you previously worked around the broken CJS path (e.g. with a custom resolver), you can drop the workaround.
- If you explicitly relied on the previous *shallow* watch behavior (very unlikely, since array mutations were silently broken), pass `{ deep: false }` to restore it.
- If you passed arbitrary strings to a boolean param expecting `false` (e.g. `?flag=foo`), you will now get the `defaultValue` rather than `false`. Use an explicit `?flag=false` for clarity.
- For a **number array**, the default must be non-empty (e.g. `[0]`) so the parser knows the item type at runtime. An empty default `[]` is treated as a string array. This was already the behavior in 1.0.x — just now documented.

## [1.0.5] — Previous release

Initial widely-used release. See git history for details.
