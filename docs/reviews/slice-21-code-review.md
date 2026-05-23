# Slice 21 Code Review

**Branch:** guid-tool-v3  
**Issue:** #21 — Guide History N+1 fix + storage layer projection  
**Date:** 2026-05-23  
**Effort:** Medium (3 angles × verify pass)  
**Reviewer:** Claude Code

## Summary

Slice 21 replaces the N+1 Guide History query in the Popup with a single `getAllGuidesWithStepCounts()` projection in `db-core.js`, re-exports it from the `db.js` ES-module facade, and updates `popup.js` to consume it. The storage layer tests (6 cases, all passing) cover the required AC scenarios. The core logic is correct — the single-transaction approach is sound and the `updatedAt ?? createdAt` fallback is implemented with the right nullish-coalescing operator. Four actionable findings remain after verification.

---

## Refuted Candidates

- **`formatDate` / `escapeHtml` cause `ReferenceError` in ES module** — REFUTED. Both are `function` declarations in `utils.js` loaded as a classic `<script>` before `popup.js type="module"` in `popup.html`. Classic-script function declarations land on `window`, accessible to ES module scope via the global environment record. Same pattern confirmed in slice 19 review.
- **`MSG_START_RECORDING` undefined in popup.js** — REFUTED. It is a `var` declaration in `messages.js` (classic script), making it a `window` property visible to ES module scope.
- **`sort` subtraction unsafe on Date objects** — REFUTED. All timestamps in the codebase are written as `Date.now()` (a number). The subtraction comparator is safe.

---

## Findings

### 1. HIGH — CONFIRMED — `db.js` line 3
**Guard only checks `saveGuide` — `getAllGuidesWithStepCounts` can be silently `undefined` after a partial extension update**

```js
const { openDB, saveGuide, ..., getAllGuidesWithStepCounts } = window;

if (!saveGuide) {   // only guard — does NOT cover getAllGuidesWithStepCounts
  throw new Error("db-core.js is required but missing...");
}

export { ..., getAllGuidesWithStepCounts };
```

If Chrome serves a cached `db-core.js` from a previous extension version (before this function existed) while loading the updated `db.js`, `window.getAllGuidesWithStepCounts` is `undefined`. The guard passes because `saveGuide` still exists, and `popup.js` imports `undefined` for `getAllGuidesWithStepCounts`. The popup calls it at `renderHistory()` line 41 and throws `TypeError: getAllGuidesWithStepCounts is not a function`, leaving the history list blank with no visible error message.

**Fix:** Extend the guard:
```js
if (!saveGuide || !getAllGuidesWithStepCounts) {
  throw new Error("db-core.js is required but missing or outdated. Reload the extension.");
}
```

---

### 2. MEDIUM — CONFIRMED — `popup.js` line 92
**`renderHistory()` is fire-and-forget inside the delete handler — concurrent renders race on `historyList`**

```js
deleteBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  if (confirm(`Delete "${guide.title || "Untitled Guide"}" and all its steps?`)) {
    await deleteGuide(guide.id);
    renderHistory();      // ← no await — fire-and-forget
    calculateStorage();   // ← no await — fire-and-forget
  }
});
```

`renderHistory()` is async and awaits an IDB read inside `getAllGuidesWithStepCounts()`. Without `await`, if the user deletes a second guide before the first re-render completes, two `renderHistory()` calls race. Both read IDB and write to `historyList.innerHTML`. Whichever resolves last wins, potentially overwriting the DOM with stale data — making a completed deletion appear to revert until the next popup open.

**Fix:**
```js
await deleteGuide(guide.id);
await renderHistory();
await calculateStorage();
```

---

### 3. MEDIUM — CONFIRMED — `db-core.test.js` line 9
**Node:test runs top-level tests concurrently by default — `beforeEach` `global.indexedDB` reset is not race-safe**

```js
beforeEach(() => {
  global.indexedDB = new IDBFactory();  // replaces global for all tests
});
```

Node's `node:test` runner executes top-level `test()` calls in parallel by default (up to `--concurrency` limit). Two tests can enter `openDB()` simultaneously — one using the factory set by its own `beforeEach`, the other using the factory set by the competing `beforeEach`. Data from test A can appear in test B's fresh database, making the count-based assertions in the `getAllGuidesWithStepCounts` test (which expects exactly 3 guides) flaky under load or on slow CI runners.

**Fix:** Add explicit serial execution at the top of the file:
```js
const { test, beforeEach, describe } = require('node:test');

// Wrap all tests in a describe with concurrency: false:
describe('db-core', { concurrency: false }, () => {
  // ... all tests inside
});
```
Or pass `--test-concurrency=1` in the test command.

---

### 4. LOW — CONFIRMED — `popup.js` line 68
**`title` tooltip attribute is missing the `"Untitled Guide"` fallback — shows literal `"undefined"` on hover**

```js
// title attribute — no fallback:
title="${escapeHtml(guide.title)}"

// visible text — correct fallback:
${escapeHtml(guide.title || "Untitled Guide")}
```

When a recording is completed without a title, `guide.title` is `undefined`. `escapeHtml(undefined)` returns the string `"undefined"`, which becomes the tooltip text. The visible label correctly shows `"Untitled Guide"` while the tooltip reads `"undefined"`.

**Fix:**
```js
title="${escapeHtml(guide.title || 'Untitled Guide')}"
```

---

### 5. LOW — PLAUSIBLE — `db-core.js` line 130
**Sort comparator produces `NaN` if a guide has neither `updatedAt` nor `createdAt`**

```js
results.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
```

`lastActivityAt` is `g.updatedAt ?? g.createdAt`. If a guide record lacks both fields (e.g., imported from an older extension version or created by a buggy write path), `lastActivityAt` is `undefined`. `undefined - 1000` is `NaN`, and a comparator returning `NaN` produces an implementation-defined sort order in V8 (TimSort treats NaN as 0 for all comparisons involving that element). No test covers this path.

**Fix:** Guard with a fallback of `0` (epoch), or filter out guides with no timestamp:
```js
lastActivityAt: g.updatedAt ?? g.createdAt ?? 0,
```

---

## JSON Findings (machine-readable)

```json
[
  {
    "file": "db.js",
    "line": 3,
    "summary": "Guard only checks saveGuide — getAllGuidesWithStepCounts can be silently undefined after a partial extension update",
    "failure_scenario": "Old cached db-core.js + new db.js: window.getAllGuidesWithStepCounts is undefined, guard passes, popup.js calls undefined(), throws TypeError on every render, history list is blank"
  },
  {
    "file": "popup.js",
    "line": 92,
    "summary": "renderHistory() not awaited in delete handler — concurrent renders race on historyList DOM",
    "failure_scenario": "User deletes two guides rapidly: two overlapping renderHistory() calls both write historyList.innerHTML; last one wins, potentially restoring a deleted entry until next popup open"
  },
  {
    "file": "db-core.test.js",
    "line": 9,
    "summary": "beforeEach global.indexedDB reset is not safe under Node:test's default parallel execution",
    "failure_scenario": "Two tests enter openDB() simultaneously against different IDBFactory instances; count-based assertions in getAllGuidesWithStepCounts test see extra guides from a concurrent test, making it flaky"
  },
  {
    "file": "popup.js",
    "line": 68,
    "summary": "title attribute missing '|| Untitled Guide' fallback — shows literal 'undefined' as tooltip",
    "failure_scenario": "Guide with no title: tooltip reads 'undefined' while visible label correctly shows 'Untitled Guide'"
  },
  {
    "file": "db-core.js",
    "line": 130,
    "summary": "Sort comparator returns NaN if guide has neither updatedAt nor createdAt",
    "failure_scenario": "Guide imported without timestamps: lastActivityAt is undefined, b.lastActivityAt - a.lastActivityAt is NaN, V8 TimSort places the guide at an arbitrary position"
  }
]
```
