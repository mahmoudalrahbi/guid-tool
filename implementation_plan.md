# Implementation Plan: Extract annotator.js and describer.js (Slice 18)

## Goal
Decouple the screenshot annotation and step description logic from `background.js` by extracting them into dedicated modules (`annotator.js` and `describer.js`). Establish an adapter seam for future AI description integrations.

## Proposed Changes

### 1. Extract `annotator.js`
#### [NEW] `annotator.js`
- Extract the `annotateScreenshot` function from `background.js`.
- It will remain a global function to be loaded via `importScripts()`.
- It will continue to use the globally available `CONFIG` and `blobToDataUrl` (from `config.js` and `utils.js`).

### 2. Extract `describer.js`
#### [NEW] `describer.js`
- Extract the `ruleBasedDescription` function from `background.js`.
- Create a new primary function: `describe(metadata, aiProvider = null)`.
- The `describe` function will use the adapter seam pattern:
  - If `aiProvider` is provided, it can be used to generate the description (async).
  - If no provider is given (or as a baseline/fallback), it returns the result of `ruleBasedDescription(metadata)`.

### 3. Update `background.js`
#### [MODIFY] `background.js`
- Add `"annotator.js"` and `"describer.js"` to the `importScripts()` call.
- Remove the local implementations of `annotateScreenshot` and `ruleBasedDescription`.
- Update the call site in `handleClickCaptured` to use `await describe(metadata)` (since it may become async if an AI provider is used) instead of `ruleBasedDescription(metadata)`.

### 4. Create ADR-0007
#### [NEW] `docs/adr/0007-describer-adapter-seam.md`
- As requested in the handoff document, create this Architectural Decision Record.
- **Context**: We are building an opt-in AI description feature with multiple potential providers (Gemini OAuth, BYOK OpenAI, etc.). We need to keep `background.js` clean and prevent provider-specific logic from polluting the main service worker.
- **Decision**: Inject the AI provider into `describe()` as an argument (`describe(metadata, aiProvider)`), rather than having `describer.js` or `background.js` directly import or manage provider logic.
- **Consequences**: This decision is load-bearing for the AI descriptions workstream. It creates a clear boundary (adapter seam), makes testing easy via mock providers, and ensures the core architecture doesn't change when adding new AI services.

## Verification Plan

### Automated Tests
- Since Slice #14 established the test runner pattern, write unit tests for `describer.js` to ensure `ruleBasedDescription` returns correct strings and `describe` handles the adapter seam properly.
- If possible in the test environment, write tests for `annotator.js` (though `OffscreenCanvas` may require mocking or environment specific setup).

### Manual Verification
- Load the extension in Chrome (`/Users/macbook/Desktop/guid-tool-slice-18`).
- Run a Recording Session.
- Verify that steps are captured with correctly annotated screenshots and rule-based descriptions.
