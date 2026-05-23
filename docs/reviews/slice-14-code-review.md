# Code Review: Slice 14 — Shared Utils Extraction

**Branch**: guid-tool-v3  
**Reviewed by**: Claude Code (high-effort, 3-angle + verify)  
**Date**: 2026-05-23  
**Scope**: Uncommitted working-tree changes implementing slice 14 (extracting `escapeHtml`, `formatDate`, `dataUrlToBlob`, `blobToDataUrl` into shared `utils.js`)

---

## Summary

2 confirmed findings. All other candidates (FileReader/Buffer in service worker, escapeHtml test assertion, raw dataUrl XSS, popup title attribute inconsistency) were refuted by verification.

---

## Finding 1 — HIGH: PDF export crashes on every invocation

**File**: `exports/pdf.js`  
**Line**: 121–132

**Bug**: The `.then((pdf) => { ... })` callback that adds page footers mutates the jsPDF object but has no `return pdf` statement. The Promise from `.then()` resolves to `undefined`. The chained `.output('blob')` is therefore called on `undefined` → `TypeError: Cannot read properties of undefined (reading 'output')`. Every PDF export throws.

**Failure scenario**: User clicks PDF export → `exportToPdf` reaches the chain → `.then()` resolves to `undefined` → `undefined.output('blob')` throws → `pdfBlob` is never assigned → export silently fails or surfaces an unhandled rejection.

**Fix**:
```js
}).then((pdf) => {
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(161, 161, 170);
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.text("Made with LocalGuide", 0.5, pageHeight - 0.25);
  }
  return pdf; // <-- ADD THIS
}).output('blob');
```

---

## Finding 2 — MEDIUM: `blobToDataUrl` Promise hangs forever on FileReader error

**File**: `utils.js`  
**Line**: 36

**Bug**: The new shared `blobToDataUrl` only wires `reader.onload`; there is no `reader.onerror` handler. If FileReader fires an error event (corrupted blob, partial IndexedDB write, browser policy rejection), the returned Promise never resolves or rejects — it hangs permanently.

**Failure scenario**: A corrupted JPEG blob (e.g. from a failed `captureVisibleTab` or partial IndexedDB write) causes FileReader to fire `onerror`. The Promise at line 34 never settles. `annotateScreenshot` in `background.js` stalls at `return blobToDataUrl(outBlob)`. `Promise.all(steps.map(...blobToDataUrl...))` in `exports/html.js`, `exports/pdf.js`, and `exports/markdown.js` all hang indefinitely with no error surfaced to the user.

**Fix**:
```js
function blobToDataUrl(blob) {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {  // expose reject
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);        // handle errors
      reader.readAsDataURL(blob);
    });
  }
  // Node fallback for testing
  return blob.arrayBuffer().then(buf => {
    const base64 = Buffer.from(buf).toString('base64');
    return `data:${blob.type};base64,${base64}`;
  });
}
```

---

## Refuted Candidates (for completeness)

| Candidate | Verdict | Reason |
|-----------|---------|--------|
| `background.js:183` — Buffer not in service worker | REFUTED | Old code used `FileReader` directly (no guard), confirming it IS available in Chrome Extension MV3 SWs; Buffer fallback is never reached |
| `utils.test.js:7` — escapeHtml test fails on single quotes | REFUTED | `\'rest\'` in a single-quoted JS string is a literal `'`, not `&#x27;`; the test correctly asserts the actual behavior and passes |
| `exports/html.js:15` — raw dataUrl XSS in src attribute | REFUTED | `blobToDataUrl` always produces standard base64 (charset: A-Z, a-z, 0-9, +, /, =); no `"` or `<` can appear, no breakout possible |
| `popup.js:72` — empty title attribute vs "Untitled Guide" text | REFUTED | Pre-existing split in the old code; not introduced by this diff |
| ES module / global coupling in export modules | N/A | Works correctly in browser: utils.js plain script runs before editor.js module, globals are on `window` and accessible as bare identifiers in ES modules |
