# LocalGuide — Bug Report

Generated: 2026-05-15

---

## BUG-1 (HIGH): Race condition in step saving
**File:** `background.js:7–43`

When two tabs are recording simultaneously and both send `capture_click` at nearly the same time, both read `steps` from storage before either write completes. The second write overwrites the first — losing a step.

```js
// Both reads happen before either write finishes
chrome.storage.local.get(['isRecording', 'steps'], (data) => {
  const updatedSteps = [...(data.steps || []), newStep]; // drops concurrent step
  chrome.storage.local.set({ steps: updatedSteps }, ...);
});
```

**Fix:** Re-read steps inside the set callback using a read-modify-write pattern (get inside the capture callback, then set), so the append always operates on the latest persisted array.

---

## BUG-2 (MEDIUM): No error check in Start/Stop button callbacks
**File:** `popup.js:39–53`

If the background service worker is unavailable, `chrome.runtime.lastError` is set but never checked. The UI switches to "Recording in progress…" even though recording never started.

```js
startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'start_recording' }, () => {
    // chrome.runtime.lastError never checked
    updateUI(true, ...); // UI says recording even on failure
  });
});
```

**Fix:** Check `chrome.runtime.lastError` and `response.success` before calling `updateUI`.

---

## BUG-3 (MEDIUM): Stale closure array — drag-drop vs. delete race
**File:** `gallery.js:44–103`

The `steps` array is closed over from a single `chrome.storage.local.get` call. Both the drag-drop `drop` handler and the delete `click` handler mutate and save this same array object. A delete fired before the drag-drop re-render completes saves a stale array, corrupting the list.

**Fix:** Re-read from `chrome.storage.local.get` before every write, rather than mutating the closed-over array.

---

## BUG-4 (LOW): `document.head` may be null
**File:** `content.js:33`

```js
document.head.appendChild(s); // crashes if <head> is absent
```

Some pages (frameless iframes, `about:blank`) have no `<head>`. This throws a TypeError and breaks the step-captured flash notification.

**Fix:** `(document.head || document.documentElement).appendChild(s)`

---

## BUG-5 (LOW): Single quotes not escaped in `escapeHtml`
**File:** `utils.js:17–23`

`escapeHtml` escapes `&`, `<`, `>`, and `"` but not `'`. If the function is used in a single-quote attribute context, a crafted `elementInfo` value could break out.

**Fix:** Add `.replace(/'/g, '&#x27;')` to the escape chain.

---

## BUG-6 (LOW): Missing `lang` attribute on `<html>`
**Files:** `popup.html:2`, `gallery.html:2`

Both pages are missing `lang="en"`, causing accessibility validator failures and incorrect screen reader language detection.

**Fix:** Change `<html>` to `<html lang="en">`.

---

## BUG-7 (LOW): `dragSrcIndex` not reset after cancelled drag
**File:** `gallery.js:30–35`

On drag cancel (Escape, drag to invalid target), `dragend` fires but `drop` does not. `dragSrcIndex` retains its stale value until the next `dragstart`.

**Fix:** Add `dragSrcIndex = null;` inside the `dragend` handler.

---

## Status

| ID     | Severity | File            | Description                               | Status  |
|--------|----------|-----------------|-------------------------------------------|---------|
| BUG-1  | HIGH     | background.js   | Race condition loses steps on capture     | Fixed   |
| BUG-2  | MEDIUM   | popup.js        | No lastError check → UI desync            | Fixed   |
| BUG-3  | MEDIUM   | gallery.js      | Stale closure causes drag+delete corrupt  | Fixed   |
| BUG-4  | LOW      | content.js      | document.head null crash                  | Fixed   |
| BUG-5  | LOW      | utils.js        | Single quote not escaped                  | Fixed   |
| BUG-6  | LOW      | popup.html/gallery.html | Missing lang attribute            | Fixed   |
| BUG-7  | LOW      | gallery.js      | dragSrcIndex stale after cancel           | Fixed   |
