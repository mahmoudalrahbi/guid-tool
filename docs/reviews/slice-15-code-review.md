# Slice 15 Code Review

**Branch:** guid-tool-v3  
**Date:** 2026-05-23  
**Effort:** Medium (3 angles × verify pass)  
**Reviewer:** Claude Code

## Summary

Slice 15 consolidates `db.js` (ES module) and `db-sw.js` (plain script) into a single `db-core.js` file loaded as a classic `<script>` tag. The main risk introduced is a demotion of load-time DB failures from hard errors to silent runtime `ReferenceError`s. One latent footgun in the service worker scope is also introduced.

---

## Findings

### 1. HIGH — CONFIRMED — `editor.js` line 1
**Silent data loss when db-core.js fails to load**

Removing the ES module import means a mid-file parse error in `db-core.js` causes deferred `ReferenceError`s instead of a hard load-time failure.

**Failure scenario:** `db-core.js` has a syntax/parse error past the `openDB` definition (so `saveGuide` is never declared) → `editor.js` executes normally (module scripts are independent of classic-script failures) → user edits for 20 minutes → every keystroke debounces to `saveAll()` → `ReferenceError: saveGuide is not defined` thrown inside async function → unhandled promise rejection, save-status shows "Saving…" forever, all edits silently lost on tab close. The old `import { saveGuide } from './db.js'` would have refused to link and shown a hard error immediately.

---

### 2. HIGH — CONFIRMED — `popup.js` line 1
**Removed ES module import leaves popup with zero declared DB dependencies**

`popup.js` is now a `type="module"` script with no imports. Its entire DB dependency is invisible — only visible in the HTML.

**Failure scenario:** A developer creates a second popup variant HTML file, copies `<script type="module" src="popup.js">` but omits `<script src="db-core.js">` because `popup.js` looks self-contained → `renderHistory()` calls `getAllGuides()` → `ReferenceError: getAllGuides is not defined` → unhandled rejection, popup renders with an empty history list and no error message. Previously the `import` declaration in `popup.js` made the `db.js` dependency self-documenting and load-time enforced.

---

### 3. MEDIUM — PLAUSIBLE — `background.js` line 4
**Service worker now exposes destructive DB functions that did not exist before**

Switching from `db-sw.js` to `db-core.js` via `importScripts` exposes `deleteGuide`, `deleteStep`, and `getAllGuides` as SW globals. Previously only 4 read/write functions existed in the SW scope.

**Failure scenario:** Developer adds a `DISCARD_RECORDING` message handler and calls `deleteGuide(session.guideId)` — works silently because the function is now a SW global, bypassing the intended editor-side confirmation flow and permanently deleting all steps. With `db-sw.js` this would have thrown `ReferenceError: deleteGuide is not defined`, forcing an intentional, explicit addition.

---

### 4. LOW — PLAUSIBLE — `editor.js` line 339
**`deleteStep()` is not awaited; IDB rejections are silently swallowed**

`deletedSteps.forEach(s => deleteStep(s.id))` — no `await`, no `.catch()`.

**Failure scenario:** IDB write quota exceeded mid-session → `deleteStep` rejects into an unhandled Promise → `flashSaving()` fires → `saveAll()` serialises only `currentSteps` (which excludes the "deleted" step) → on next load the step reappears in the editor, leaking storage indefinitely.

> **Note:** Pre-existing behaviour, not introduced by slice 15. The switch from a named import to a global means no linter/type-checker can flag the unawaited async call on the specific DB function.

---

### 5. LOW — CONFIRMED — `db-core.test.js` line 43
**Tests share a single fake-indexeddb instance — count assertions will be non-deterministic**

`require('fake-indexeddb/auto')` installs a single global IDB for the entire test run. The `getAllGuides` test (test 4) saves `g-4` and `g-5` then calls `getAllGuides()`, but guides `g-1` and `g-2` from earlier tests are also returned.

**Failure scenario:** The test passes today because it uses `find()` not an exact count assertion. Any future `assert.equal(guides.length, 2)` will fail non-deterministically depending on test execution order.

---

## Refuted Candidates

- **`deleteGuide` orphaned-steps race** — REFUTED. The IDB spec's active-flag mechanism keeps the transaction open while `onsuccess` handlers add requests synchronously. `tx.oncomplete` will only fire after all `stepsStore.delete()` calls enqueued inside `req.onsuccess` complete.
- **CJS `module` guard firing in service workers** — REFUTED. Classic service workers do not define `module`; `typeof module` returns `"undefined"` and the guard is never entered.
