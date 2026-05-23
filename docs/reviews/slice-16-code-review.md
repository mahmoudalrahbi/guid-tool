# Slice 16 Code Review

**Branch:** guid-tool-v3  
**Date:** 2026-05-23  
**Effort:** Medium (3 angles × verify pass)  
**Reviewer:** Claude Code

## Summary

Slice 16 introduces `messages.js` — a centralised file of 10 named constants for Chrome extension message type strings — and migrates all string literals (`"START_RECORDING"`, `"CLICK_CAPTURED"`, etc.) to those constants across `background.js`, `content.js`, `popup.js`, `sidepanel.js`, and their HTML entry points. The slice is well-executed: all constant values exactly match their previously-hardcoded strings, load order is correct on every page, and the `importScripts` / manifest injection patterns are sound. All HIGH candidates proposed during review were refuted on verification. Three LOW findings remain.

---

## Refuted Candidates

- **Module scripts cannot see `const` globals from classic scripts** — REFUTED. ECMAScript spec §9.1.1.4: all classic scripts and module scripts share the same Global Environment Record. `const` declarations land in its declarative component (not on `window`), but a module script's `[[OuterEnv]]` points to that same record, so bare-identifier lookup resolves them. `popup.js` (module) accessing `MSG_START_RECORDING` from a preceding `<script src="messages.js">` works correctly in Chrome.
- **`editor.html` missing `messages.js` causes runtime errors** — REFUTED. `editor.js` contains zero `chrome.runtime` / `chrome.tabs` message-passing calls. The omission is currently harmless.
- **`messages.test.js` line 1 `const test = require('node:test')` is wrong** — REFUTED. Node.js v18+ exports the `test` function itself as `module.exports`; both `const test = require(...)` and `const { test } = require(...)` are valid.
- **`module.exports` in `messages.js` is incomplete** — REFUTED. All 10 constants are explicitly listed in the export block.

---

## Findings

### 1. LOW — PLAUSIBLE — `editor.html` line 373
**`messages.js` not loaded in `editor.html` — only extension page excluded from the migration**

Every other extension page (`popup.html`, `sidepanel.html`) and every non-UI context (background SW via `importScripts`, content scripts via manifest) loads `messages.js`. `editor.html` does not.

**Failure scenario:** A developer adds a `chrome.runtime` message listener or sender to `editor.js` (e.g., to notify the side panel of an export event) and writes `if (msg.type === MSG_STEP_ADDED)` using the project's established `MSG_*` style. `MSG_STEP_ADDED` is `undefined` because `messages.js` is absent from `editor.html`'s script list; the comparison is always false and the handler silently never fires. No error is thrown. The omission is invisible — popup, sidepanel, and background all load `messages.js`, and the editor page looks consistent at a glance.

---

### 2. LOW — PLAUSIBLE — `messages.test.js` line 5
**Test verifies individual constant values but has no exhaustiveness assertion on `module.exports` keys**

The single test checks all 10 existing key→value pairs. It does not assert that `Object.keys(module.exports)` equals exactly those 10 keys.

**Failure scenario:** A developer adds `const MSG_EXPORT_GUIDE = 'EXPORT_GUIDE'` to `messages.js` for a new feature and uses it in a Node test environment via `require('./messages.js').MSG_EXPORT_GUIDE`, but accidentally omits it from the `module.exports` block. The constant works in the browser (global scope via the classic script), but Node consumers silently receive `undefined`. The existing test suite passes green — it only checks the original 10 keys — so CI does not catch the missing export.

---

### 3. LOW — PLAUSIBLE — `messages.js` line 3
**`const` declarations vs `function` declarations: the `db.js` window-destructuring precedent does not extend to `messages.js`**

`db.js` (the thin ES-module wrapper from slice 15) works by doing `const { saveGuide, ... } = window` because `db-core.js` uses `function` declarations, which DO become `window` properties. `messages.js` uses `const`, which does NOT become a `window` property.

**Failure scenario:** A developer follows the `db.js` precedent and writes `const { MSG_START_RECORDING } = window` to access a message constant inside an ES module context. They get `undefined` silently — the two files sit next to each other, the patterns look identical (`<script src="...">` before the module script), but they have opposite `window`-property behaviour. The distinction is undocumented. This is a documentation/trap finding rather than a current runtime bug.
