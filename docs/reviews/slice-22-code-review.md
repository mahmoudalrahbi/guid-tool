# Slice 22 Code Review

**Branch:** guid-tool-v3  
**Issue:** #22 — Export dep injection + HTML and Markdown format tests  
**Date:** 2026-05-23  
**Effort:** Low (1 diff pass, no verify)  
**Reviewer:** Claude Code

## Summary

Slice 22 injects shared helpers (`blobToDataUrl`, `escapeHtml`) via a `deps` argument into the HTML and Markdown export modules, resolving them once in the registry rather than reading browser globals on every call. The HTML and Markdown modules are fully migrated. Two findings remain.

---

## Findings

### 1. MEDIUM — `exports/registry.js:45`
**`resolvedDeps` singleton permanently bakes `undefined` if globals are absent on first call**

```js
if (!resolvedDeps) {
  resolvedDeps = {
    blobToDataUrl: globalThis.blobToDataUrl,   // may be undefined
    escapeHtml: globalThis.escapeHtml           // may be undefined
  };
}
```

`resolvedDeps` is assigned a plain object on first call. If `globalThis.blobToDataUrl` or `globalThis.escapeHtml` are not yet defined at that point (race on classic-script load order), the object is `{ blobToDataUrl: undefined, escapeHtml: undefined }`. Because the object is truthy, `if (!resolvedDeps)` never fires again — the undefined deps are cached for the module's lifetime. Every subsequent call to `exportToHtml` or `exportToMarkdown` throws `TypeError: deps.blobToDataUrl is not a function`, silently breaking all exports until the extension is reloaded.

**Fix:** Resolve lazily per-dep instead of once per object, or guard individual fields:
```js
resolvedDeps = {
  blobToDataUrl: globalThis.blobToDataUrl ?? (() => { throw new Error("blobToDataUrl not available"); }),
  escapeHtml: globalThis.escapeHtml ?? (() => { throw new Error("escapeHtml not available"); })
};
```
Or re-evaluate on every call (no caching needed given `globalThis` lookup is cheap):
```js
const deps = { blobToDataUrl: globalThis.blobToDataUrl, escapeHtml: globalThis.escapeHtml };
const blob = await format.exportFn(guide, steps, deps);
```

---

### 2. LOW — `exports/registry.js:46-48`
**Dep-injection seam is incomplete — `pdf.js` and `docx.js` still call bare globals**

The registry now passes `deps` to all format functions via `format.exportFn(guide, steps, resolvedDeps)`, but `pdf.js` and `docx.js` were not updated. They accept the third argument and ignore it, continuing to call `blobToDataUrl` and `escapeHtml` as bare globals. Two consequences:

1. The pdf and docx formats remain untestable in Node (no browser globals).
2. The AC requires "no calls to `window.*` remain" — this is satisfied for html and markdown only.

**Fix:** Apply the same `deps` migration to `pdf.js` and `docx.js` that was applied to `html.js` and `markdown.js`.

---

## JSON Findings (machine-readable)

```json
[
  {
    "file": "exports/registry.js",
    "line": 45,
    "summary": "resolvedDeps singleton caches undefined if globalThis helpers are absent on first exportGuide call — guard never re-fires, all exports throw TypeError permanently",
    "failure_scenario": "exportGuide called before utils.js classic script runs: globalThis.blobToDataUrl is undefined, cached into resolvedDeps object (truthy), if (!resolvedDeps) skips on all future calls, deps.blobToDataUrl(...) throws TypeError for the session"
  },
  {
    "file": "exports/registry.js",
    "line": 46,
    "summary": "pdf.js and docx.js not migrated — registry passes deps but both modules ignore it and call bare globals",
    "failure_scenario": "AC requires no window.* calls remain; pdf and docx still use global blobToDataUrl/escapeHtml directly, making them untestable in Node and subject to the same global-resolution race as before the slice"
  }
]
```
