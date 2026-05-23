# Architectural Hardening — Slice Breakdown

Parent PRD: #20  
Date: 2026-05-23

## Summary

Nine vertical slices breaking down the architectural hardening PRD. Each slice is independently grabbable by an AFK agent. All are `Sandcastle`-labelled on the issue tracker.

## Dependency graph

```
Slice 1  ──────────────────────────────────────  (no blockers)
Slice 2  ──────────────────────────────────────  (no blockers)
Slice 3  ── blocked by Slice 2
Slice 4  ── blocked by Slice 2 + Slice 3
Slice 5  ──────────────────────────────────────  (no blockers)
Slice 6  ──────────────────────────────────────  (no blockers)
Slice 7  ──────────────────────────────────────  (no blockers)
Slice 8  ──────────────────────────────────────  (no blockers)
Slice 9  ──────────────────────────────────────  (no blockers)
```

Slices 1, 5, 6, 7, 8, 9 can all run in parallel immediately.  
Slice 2 can also start immediately and unblocks 3 → 4.

---

## Slice 1 — Guide History projection: N+1 fix + storage tests (#21)

**Type:** AFK  
**Blocked by:** None  
**Stories:** 1, 2, 3, 4, 5

Add `getAllGuidesWithStepCounts()` to the storage layer returning `{ id, title, lastActivityAt, stepCount }[]` sorted newest-first. `lastActivityAt` is `updatedAt ?? createdAt`. Re-export from the ES-module facade. Update the Popup to call the new function instead of looping over `getStepsForGuide()` per Guide. Write full storage layer tests using `fake-indexeddb`.

See ADR-0008 for why a shared module was rejected.

---

## Slice 2 — Export dep injection + HTML and Markdown tests (#22)

**Type:** AFK  
**Blocked by:** None  
**Stories:** 6, 7

Deepen the export registry seam (ADR-0004): registry resolves `blobToDataUrl` and `escapeHtml` once and injects them as `deps`. Update HTML and Markdown format modules to `(guide, steps, deps) => Promise<Blob>`. Write tests for both with stub deps.

---

## Slice 3 — PDF and DOCX export format tests (#28)

**Type:** AFK  
**Blocked by:** Slice 2 (#22)  
**Stories:** 6

Following the dep injection pattern from Slice 2: update PDF and DOCX format modules to accept `deps` instead of calling `window.html2pdf` and `window.docx` directly. Write tests using injected stubs.

---

## Slice 4 — Export registry tests: dispatch and download trigger (#29)

**Type:** AFK  
**Blocked by:** Slice 2 (#22) + Slice 3 (#28)  
**Stories:** 6, 7

Test that `exportGuide()` dispatches to the correct format function per format id and triggers a file download with a correctly derived filename. Test that `getExportFormats()` returns all four registered formats.

---

## Slice 5 — Drag-drop factory refactor + state isolation tests (#23)

**Type:** AFK  
**Blocked by:** None  
**Stories:** 10

Refactor drag-drop module to `createDragDrop(stepsList, config)` factory returning `{ destroy() }`. All mutable state (`dragSrc`, `scrollVelocity`, RAF handle) moves into the closure. Write tests: two instances share no state; drop fires `onReorder` with correct indices; state resets after `dragend`.

---

## Slice 6 — Annotator tests: DPI scaling and annotation logic (#24)

**Type:** AFK  
**Blocked by:** None  
**Stories:** 8

Add tests for DPI scaling (circle radius proportional to device pixel ratio), annotation coordinate accuracy, and invalid dependency handling. Current coverage: one happy-path test only.

---

## Slice 7 — Step card tests: delete, edit, and renumber flows (#25)

**Type:** AFK  
**Blocked by:** None  
**Stories:** 9

Add tests: delete button fires `onDelete`; textarea change fires `onDescChange` with updated value; `renumber()` updates all step number elements to correct 1-based index. Do not assert on CSS class names.

---

## Slice 8 — Toast tests: timeout, dismiss, and undo coverage (#26)

**Type:** AFK  
**Blocked by:** None  
**Stories:** 11

Add tests: toast removed after timeout; undo callback fires on click; no undo button when `undoFn` not provided. Use `setTimeout` interception — no real wall-clock waiting.

---

## Slice 9 — Export menu tests: export callback and dropdown close (#27)

**Type:** AFK  
**Blocked by:** None  
**Stories:** 12

Add tests: format button fires `onExport` with correct format id; document click closes dropdown; click inside dropdown does not close it.

---

## Out of scope (deferred to future PRD)

- `background.js` Step capture pipeline seam (Candidate 5 — speculative)
- Tests for `popup.js`, `sidepanel.js`, `editor.js`, `content.js` — DOM-heavy, require shape changes first
