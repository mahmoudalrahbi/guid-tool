# Slice 17 Code Review

**Branch:** guid-tool-v3  
**Date:** 2026-05-23  
**Effort:** Medium (3 angles × verify pass)  
**Reviewer:** Claude Code

## Summary

Slice 17 introduces `config.js` — a central `CONFIG` object holding all magic constants — and migrates hardcoded values from `background.js`, `content.js`, `db-core.js`, and `editor.js`. The mechanics are sound: load order is correct in all HTML files and `importScripts`, all constant values match their originals, and the `db-core.test.js` CONFIG injection is safe. Four confirmed findings remain, all relating to scale ambiguity, format coupling, or migration safety made worse by the centralization.

---

## Refuted Candidates

- **`db-core.test.js` CONFIG injection timing** — REFUTED. `global.CONFIG = require('./config.js')` on line 6 is synchronous and precedes `require('./db-core.js')` on line 7. `db-core.js` uses CONFIG only inside function bodies (call-time), never at module evaluation time, so the assignment is always in place before the first IDB call.
- **`popup.js` module can't see classic-script `const` globals** — REFUTED (same basis as slice 16 review). Top-level `const` in a classic `<script>` lands in the global declarative environment record, which is reachable from module scripts via the scope chain.
- **CONFIG mutability causes current breakage** — REFUTED as a current bug. No code in the repository writes to any `CONFIG` property after initial assignment. Demoted to PLAUSIBLE latent risk (see Finding 5).

---

## Findings

### 1. MEDIUM-HIGH — CONFIRMED — `db-core.js` line 4 / `config.js` line 3
**Bumping `CONFIG.DB_VERSION` silently skips all schema migrations — slice 17 turned a single-file gap into a cross-file trap**

The `onupgradeneeded` handler has no `e.oldVersion` / `e.newVersion` check. Its entire body is two `!db.objectStoreNames.contains(...)` guards that are no-ops on existing installs. Before slice 17, `DB_VERSION` lived as a local `const` inside `db-core.js` directly above the migration handler — the missing migration logic was immediately visible. Now `DB_VERSION: 1` is a one-line entry in `config.js`, and the handler is in a separate file a developer may never open.

**Failure scenario:** Developer adds a new IDB index, increments `CONFIG.DB_VERSION` to 2 in `config.js`, deploys. On existing user installs `onupgradeneeded` fires; both `contains()` checks return `true`; the handler is a silent no-op; the new index is never created. Every call that opens a transaction on the missing index throws `DOMException`. There is no error surface during the config change.

---

### 2. MEDIUM — CONFIRMED — `config.js` lines 8 and 13
**`CAPTURE_QUALITY: 80` (int 0–100) and `ANNOTATION_JPEG_QUALITY: 0.82` (float 0.0–1.0) use different scales with no unit annotation**

The two constants sit four lines apart and are the only quality-related entries. `CAPTURE_QUALITY` feeds `chrome.tabs.captureVisibleTab` (0–100 integer scale); `ANNOTATION_JPEG_QUALITY` feeds `OffscreenCanvas.convertToBlob` (0.0–1.0 float scale). Neither API throws on an out-of-range value.

**Failure scenario A:** Developer "normalizes" `ANNOTATION_JPEG_QUALITY` to `82` to match the integer style. `convertToBlob` clamps `82` to `1.0`, producing max-quality bloated annotation blobs — silent quality regression upward.

**Failure scenario B:** Developer changes `CAPTURE_QUALITY` to `0.80` to match the decimal style. Chrome's `captureVisibleTab` treats sub-1 floats as near-zero quality, producing severely degraded captures — silent quality regression downward.

---

### 3. MEDIUM — CONFIRMED — `background.js` line 184
**`convertToBlob` quality is silently ignored if `CONFIG.CAPTURE_FORMAT` is changed to `"png"`, causing 5–10× larger annotation blobs**

```js
const outBlob = await canvas.convertToBlob({ type: `image/${CONFIG.CAPTURE_FORMAT}`, quality: CONFIG.ANNOTATION_JPEG_QUALITY });
```

The `quality` parameter is defined by the Canvas spec only for lossy formats (JPEG, WebP). For `"image/png"` it is silently ignored and a lossless full-resolution PNG is produced.

**Failure scenario:** Developer changes `CONFIG.CAPTURE_FORMAT` to `"png"` for higher fidelity. Each annotated screenshot grows from ~150 KB to ~1–3 MB. With dozens of steps, IndexedDB storage balloons well past practical limits. `captureVisibleTab` also ignores `quality` for PNG captures. No error is thrown at any call site.

---

### 4. LOW — CONFIRMED — `editor.js` line 374
**`'opacity 200ms'` is the only timing constant in the touched function not migrated to CONFIG — desyncs from `UI_TOAST_FADEOUT_MS` on any future change**

The `showToast` function was partially migrated:
```js
setTimeout(() => {
  t.style.transition = 'opacity 200ms';       // hardcoded — NOT migrated
  t.style.opacity = '0';
  setTimeout(() => t.remove(), CONFIG.UI_TOAST_FADEOUT_MS);  // 220ms
}, CONFIG.UI_TOAST_TIMEOUT_MS);
```

Current behavior is intentional: the fade animation completes at 200 ms then the element is removed 20 ms later. The 200 ms value is not in CONFIG.

**Failure scenario:** Developer changes `CONFIG.UI_TOAST_FADEOUT_MS` to 150 ms. The DOM element is removed 50 ms before the CSS transition finishes — a visible snap instead of a fade. Raising it to 500 ms leaves the toast invisible-but-present in the DOM for 300 ms after the animation completes. There is no CONFIG key to change the animation duration, making the pair impossible to tune consistently.

---

### 5. LOW — PLAUSIBLE — `config.js` line 1
**CONFIG object is not frozen — co-loaded scripts can silently mutate shared constants**

`const CONFIG = { ... }` makes the binding constant but all properties remain writable. No `Object.freeze(CONFIG)` call exists. In the background service worker, everything loaded via `importScripts` shares the same global scope; in HTML pages, all classic scripts share the global declarative environment.

**Failure scenario:** A future test writes `CONFIG.CAPTURE_FORMAT = 'png'` to exercise a code path, mutating the live shared object. All subsequent calls in the same execution context silently use the mutated value — JPEG quality constants become semantically wrong and annotation blobs grow unbounded. No `TypeError` is thrown. Currently no code mutates CONFIG; `Object.freeze(CONFIG)` would convert any future accidental write into a hard error.
