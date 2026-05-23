# ADR 0005: Test runner choice

**Date:** 2026-05-23
**Status:** Accepted

## Context
As part of the structural refactor to make LocalGuide's internals more robust and testable (specifically extracting `utils.js`), we need to introduce a test runner. The extension operates within Chrome Manifest V3 constraints, relying on globals like `Blob`, `FileReader`, and `atob`/`btoa`.

## Decision
We will use **Node.js's built-in `node:test` module** alongside `node:assert`.

## Rationale
- **Zero Dependencies:** Keeps the package size minimal and requires no heavy installation step.
- **Built-in Support:** Native to Node.js (v18+), ensuring long-term support and stability.
- **Speed:** Extremely fast execution, suitable for the rapid Red-Green-Refactor cycles of TDD.
- **Compatibility:** While MV3 enforces strict constraints like lack of ES module support in `importScripts`, we can test plain JS files in Node by conditionally checking `if (typeof module !== 'undefined') module.exports = {...}`. Node 18+ provides many web globals natively (e.g., `Blob`, `atob`, `btoa`), making tests lightweight and avoiding heavy DOM emulators for purely logical utility functions.

## Consequences
- We do not need heavy tooling like Jest or Vitest.
- If we need to test DOM-heavy code in the future, we may need to introduce JSDOM or a similar polyfill, or lean on end-to-end browser testing. For pure data transformation functions (which is the goal of this refactor phase), `node:test` is ideal.
