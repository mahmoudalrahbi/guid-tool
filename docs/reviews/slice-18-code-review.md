# Slice 18 Code Review

**Branch:** guid-tool-v3  
**Date:** 2026-05-23  
**Effort:** Medium (3 angles × verify pass)  
**Reviewer:** Claude Code

## Summary

Slice 18 extracts `annotateScreenshot` from `background.js` into `annotator.js` and `ruleBasedDescription` from `background.js` into `describer.js`, adding a new `describe(metadata, aiProvider = null)` adapter-seam function and accompanying tests. The mechanical extraction is correct: `importScripts` load order is right (`utils.js` before `annotator.js`), all `CONFIG.*` keys used in `annotator.js` (`CONFIG.ANNOTATION.RADIUS_PX`, `CONFIG.ANNOTATION.COLOR`, `CONFIG.ANNOTATION.STROKE_WIDTH_PX`, `CONFIG.CAPTURE_FORMAT`, `CONFIG.ANNOTATED_QUALITY`) match their names in `config.js`, and `blobToDataUrl` is a global `function` declaration in `utils.js` available at the point `annotator.js` runs. Three findings remain, all on the new `describe()` adapter seam and its test coverage.

---

## Refuted Candidates

- **`fetch()` not available in Chrome MV3 service workers** — REFUTED. `fetch()` is a standard global in Chrome MV3 service workers; it can also fetch `data:` URIs. The call at `annotator.js` line 4 is correct.
- **`convertToBlob` receiving `"jpeg"` instead of a MIME type** — REFUTED. The code constructs `` `image/${CONFIG.CAPTURE_FORMAT}` `` which correctly produces `"image/jpeg"`.
- **`ruleBasedDescription` produces `Click "undefined"` from real content-script metadata** — REFUTED as a live bug. `content.js` always sets `metadata.tag = el.tagName.toLowerCase()`, making `tag` always truthy. The fallback chain `meta.label || meta.text || meta.tag` can never reach `undefined` in production. (The edge case is real in unit tests that omit all three fields, but not reachable from the extension's capture path.)
- **`describe()` returning null as a current production bug** — REFUTED as a live bug. Every production call site is `background.js` line 133: `await describe(metadata)` with no `aiProvider` argument. `aiProvider` defaults to `null`; the `if (aiProvider)` branch is never entered today. Demoted to PLAUSIBLE latent risk (see Finding 1).

---

## Findings

### 1. MEDIUM — PLAUSIBLE — `describer.js` lines 9–16
**AI adapter seam catches thrown errors only — a provider returning null/undefined/empty string bypasses the rule-based fallback**

```js
async function describe(metadata, aiProvider = null) {
  if (aiProvider) {
    try {
      return await aiProvider.generateDescription(metadata);  // line 12
    } catch (err) {
      console.warn("AI provider failed to generate description, falling back to rule-based:", err);
    }
  }
  return ruleBasedDescription(metadata);
}
```

The `catch` block fires only on thrown exceptions. If `generateDescription()` resolves to `null`, `undefined`, or `""` — a common pattern for "no result available" in AI provider SDKs — `return` on line 12 exits the function with that value. The fallback `ruleBasedDescription(metadata)` is never reached.

**Why this matters now:** ADR-0007 (`docs/adr/0007-describer-adapter-seam.md`) explicitly identifies this seam as the integration point for upcoming AI providers (Gemini OAuth, BYOK OpenAI/Mistral). The first implementation that passes a real `aiProvider` will hit this gap. When triggered, `step.description` is `null`; `sidepanel.js` renders the step with the string `"null"`, and `editor.js` populates the textarea with `"null"` — a silent data corruption instead of a graceful fallback.

**What would confirm it:** Pass any provider whose `generateDescription` returns `Promise.resolve(null)` (quota-hit, empty response, etc.); verify the saved step has `description: null`.

---

### 2. LOW — PLAUSIBLE — `annotator.js` line 25
**`blobToDataUrl` is an undeclared implicit global with no static enforcement**

```js
  return blobToDataUrl(outBlob);
  // blobToDataUrl is expected to be available globally (from utils.js)
```

`blobToDataUrl` is a `function` declaration in `utils.js` (line 32) and is available globally at runtime because `importScripts` order places `utils.js` before `annotator.js`. The comment documents the dependency, but there is no `import` statement, no runtime guard, and no test that exercises `annotator.js` in isolation. Any of the following would produce a silent `ReferenceError`: reordering the `importScripts` arguments, removing `utils.js` from the line, or (for future contributors) attempting to unit-test `annotator.js` without stubbing the global.

**Failure scenario:** Developer adds a new script between `db-core.js` and `utils.js` in `importScripts`, accidentally displacing `utils.js` to after `annotator.js`. `annotateScreenshot` is called; `blobToDataUrl` is `undefined`; `TypeError: blobToDataUrl is not a function` at runtime with no prior indication anything was wrong.

---

### 3. LOW — CONFIRMED — `describer.test.js`
**No exhaustiveness check on `module.exports` — a future missing export would stay invisible**

`describer.test.js` tests the runtime behavior of `ruleBasedDescription` and `describe` but does not assert that `Object.keys(module.exports)` equals exactly `["ruleBasedDescription", "describe"]`.

**Failure scenario:** A developer adds `function formatLabel(meta)` to `describer.js` to DRY up the label extraction, exposes it in `module.exports` by mistake, and also forgets to add it to exports — both failure modes pass the existing test suite. In Node.js consumers (future test helpers or scripts), `require('./describer.js').formatLabel` returns `undefined` with no test failure. This is the same structural gap as slice 16 Finding 2 in `messages.test.js`.
