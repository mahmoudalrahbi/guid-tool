# 6. Plain JS globals for db-core.js due to Chrome MV3 constraints

Date: 2026-05-23

## Status

Accepted

## Context

LocalGuide uses IndexedDB to store guides and captured steps. This storage needs to be accessed by multiple extension contexts: the background service worker (for capturing steps) and the UI pages (editor, popup).

In Chrome Manifest V3, the background service worker uses `importScripts()` to load dependencies. However, `importScripts()` does not support ES modules (files containing `import` or `export` statements). As a result, the project previously maintained two separate database wrapper files:
- `db.js`: An ES module with `export` statements used by `editor.js` and `popup.js`.
- `db-sw.js`: A plain JS file used by the background service worker via `importScripts()`.

This duplication created maintenance overhead and a structural friction point.

## Decision

We decided to consolidate the database wrapper into a single `db-core.js` file that contains zero ES module syntax. 

To achieve this:
1. `db-core.js` exposes its functions (e.g., `saveGuide`, `getGuide`) as plain global variables.
2. The background service worker loads it via `importScripts("db-core.js")`.
3. The UI pages (`editor.html`, `popup.html`) load it via a `<script>` tag before their respective module scripts, exposing the functions on the `window` object.
4. For testability in a Node.js environment, `db-core.js` includes a conditional fallback: `if (typeof module !== "undefined" && module.exports) { module.exports = { ... }; }`.

## Consequences

- **Positive:** We now have a single, unified database interface (`db-core.js`), reducing code duplication and eliminating the need to keep `db.js` and `db-sw.js` in sync.
- **Positive:** We can run Node.js unit tests against `db-core.js` (using `fake-indexeddb`).
- **Negative:** UI modules (`editor.js`, `popup.js`) must rely on global variables for database access instead of explicit ES module `import`s, which slightly reduces explicitness in dependency management.
