# Slice 19 Code Review

**Branch:** guid-tool-v3  
**Date:** 2026-05-23  
**Effort:** Medium (3 angles × verify pass)  
**Reviewer:** Claude Code

## Summary

Slice 19 decomposes `editor.js` into four ES modules: `editor/toast.js`, `editor/export-menu.js`, `editor/step-card.js`, and `editor/drag-drop.js`. Each module has accompanying tests. The extraction is largely clean — the export-menu refactor is functionally equivalent, `escapeHtml` and `formatDate` as bare globals in ES module context resolve correctly through `window` (verified: `utils.js` loads as a classic script before `editor.js type="module"` in `editor.html`). Two confirmed bugs remain: a `NotFoundError` that breaks every step-deletion undo, and a dead sentinel check in `showToast` that produces a false-positive test.

---

## Refuted Candidates

- **`escapeHtml` / `formatDate` cause `ReferenceError` in ES module context** — REFUTED. Both are `function` declarations in `utils.js` (classic script loaded at `editor.html` line 374 before the module script at line 379). Classic-script `function` declarations land on the global object (`window`), accessible to ES module scope via the global environment record. Same mechanism confirmed in slice 16 review.
- **`renderSteps()` called multiple times, causing duplicate listener stack-up** — REFUTED. `renderSteps()` is called exactly once inside `init()`; the undo callback in `handleDeleteStep` manually re-inserts DOM nodes without calling `renderSteps()`. Duplicate listener registration is therefore not triggered today (see Finding 3 for the latent form).
- **`formatId.toUpperCase()` in export toast crashes** — REFUTED. `formatId` is always a non-null string supplied by the format registry; `toUpperCase()` is safe.

---

## Findings

### 1. HIGH — CONFIRMED — `editor.js` line 119
**Undo on every step deletion throws `NotFoundError` — `insertBefore` receives a detached reference node**

```js
function handleDeleteStep(card, step) {
  const parent = card.parentNode;
  const gap = card.nextElementSibling?.classList.contains('insert-gap')
    ? card.nextElementSibling : null;
  const placeholderNext = card.nextElementSibling;  // === gap in all normal renders

  card.remove();
  if (gap) gap.remove();       // gap is now detached

  showToast(toastHost, 'Step deleted', CONFIG, async () => {
    if (placeholderNext) parent.insertBefore(card, placeholderNext);  // NotFoundError here
    ...
  });
}
```

`renderSteps()` appends an `insert-gap` div after every step card, so `card.nextElementSibling` is always the gap in the normal render path. `placeholderNext === gap`. After `gap.remove()`, `placeholderNext` is a detached node — no longer a child of `parent`. The DOM spec requires `insertBefore(newNode, refNode)` to throw `NotFoundError` when `refNode` is not a child of the context node.

**Failure scenario:** User deletes any step → toast appears → user clicks "Undo" → `parent.insertBefore(card, placeholderNext)` throws `NotFoundError` DOMException → the async undo callback aborts — the step is never restored, and `syncOrderAndSave()` is never called, so the deletion is now permanent.

**Fix:** Capture the element that follows the gap, not the gap itself:
```js
const placeholderNext = gap ? gap.nextElementSibling : card.nextElementSibling;
```

---

### 2. MEDIUM — CONFIRMED — `editor/toast.js` lines 13 and 17
**`t.removed` guard is a dead check — `HTMLElement.remove()` never sets this property; test gives false positive**

```js
b.onclick = () => { undoFn(); t.remove(); };   // line 8 — browser remove() sets NO property

setTimeout(() => {
  if (t.removed) return;                        // line 13 — always undefined (falsy) in browser
  t.style.transition = `opacity ${config.UI_TOAST_ANIMATION_MS}ms`;
  t.style.opacity = '0';
  setTimeout(() => {
    if (!t.removed) t.remove();                 // line 17 — !undefined is always true
  }, config.UI_TOAST_FADEOUT_MS);
}, config.EDITOR.UNDO_TIMEOUT_MS);
```

`HTMLElement.prototype.remove()` removes the node from the document but sets no `removed` property. `t.removed` is permanently `undefined` in a real browser. After the undo button removes the toast, the `UNDO_TIMEOUT_MS` timer fires, skips the guard (undefined is falsy), and runs the fade-out animation against a detached element — harmless but incorrect.

**False-positive test:** `toast.test.js` line 13 mocks `remove: function() { this.removed = true; }`, so `assert.equal(toast.removed, true)` at line 45 passes — but it is testing the mock's behaviour, not the real browser's. The intent of the guard is untested.

**Fix:** Replace the dead property check with a flag set inside the undo closure:
```js
let dismissed = false;
b.onclick = () => { dismissed = true; undoFn(); t.remove(); };
// then: if (dismissed) return;
```

---

### 3. LOW — PLAUSIBLE — `editor/drag-drop.js` lines 1–3 and 46
**Module-level singleton state + no listener cleanup on `attachDragAndDrop` — duplicate registration if `renderSteps` is ever called twice**

```js
let dragSrc = null;       // module singleton
let scrollRaf = null;
let scrollVelocity = 0;

export function attachDragAndDrop(stepsList, ...) {
  if (!stepsList.dataset.dragScrollInitialized) {
    setupDragScroll(...);   // guarded against double registration
    stepsList.dataset.dragScrollInitialized = "true";
  }
  stepsList.addEventListener('dragstart', ...);   // NOT guarded — stacks on every call
  stepsList.addEventListener('dragend', ...);
  stepsList.addEventListener('dragover', ...);
  stepsList.addEventListener('dragleave', ...);
  stepsList.addEventListener('drop', ...);
}
```

`renderSteps()` sets `stepsList.innerHTML = ""`, which clears child elements but leaves event listeners on `stepsList` itself intact. If `renderSteps()` is called a second time (e.g., a future slice adds re-render after step insertion), five new listeners are stacked per call while `dragSrc` and friends remain shared singletons. Each drop event then fires `onReorder` N times and races on `dragSrc`.

**What would trigger it:** Any future call to `renderSteps()` after initial load. Currently safe (called once in `init()`), but the guard mechanism is inconsistent — `setupDragScroll` is protected while the five step-list listeners are not.

---

### 4. LOW — PLAUSIBLE — `editor/step-card.js` line 26
**`escapeHtml` is an undeclared implicit global from a classic script — no import and no enforcement**

```js
card.innerHTML = `...${escapeHtml(step.description)}...`;    // line 26
// also line 31: ${escapeHtml((step.url || "Local file").replace(...))}
```

`escapeHtml` is a `function` declaration in `utils.js` (loaded as a classic `<script>` before `editor.js type="module"` in `editor.html`), making it accessible via `window.escapeHtml` through the module's outer scope chain. This works today. However, there is no `import` statement, no static reference in `step-card.js`, and `step-card.test.js` mocks it with `global.escapeHtml = (str) => str || ''`. If `utils.js` is ever refactored to a proper ES module and loses its `function`-declaration globals, `step-card.js` will throw `ReferenceError: escapeHtml is not defined` with no prior indication — and the test will still pass because it mocks the global.

**Same pattern as:** Slice 18 Finding 2 (`blobToDataUrl` implicit global in `annotator.js`).
