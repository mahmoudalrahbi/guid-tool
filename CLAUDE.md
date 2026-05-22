# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LocalGuide is a Chrome browser extension (Manifest V3) that records a user's browser workflow — clicks and navigations — and generates a downloadable step-by-step guide with annotated screenshots. It is a self-hosted alternative to Scribe, built specifically so teams can document internal workflows without sending sensitive data to an external service.

Read `CONTEXT.md` for the canonical domain glossary before touching any code. Use the terms there precisely — Guide, Step, Recording Session, Annotated Screenshot, Editor, Recorder, Reader.

## Architecture

The extension has four distinct surfaces:

1. **Side Panel** (`sidepanel.html/js`) — active during a Recording Session. Listens to events forwarded by the content script, renders captured Steps in real-time, and sends "Complete Capture" to the background.

2. **Content Script** (`content.js`) — injected into every tab. Captures `click` events and URL navigations, extracts element metadata (text, label, aria-label, role), and messages the background service worker.

3. **Background Service Worker** (`background.js`) — orchestrates the session. On each click event received from content script: calls `chrome.tabs.captureVisibleTab` to take a screenshot, draws the highlight circle annotation onto the screenshot via an OffscreenCanvas, generates a rule-based Step description from element metadata, and persists the Step to IndexedDB.

4. **Editor** (`editor.html/js`) — a full-page Chrome extension page opened in a new tab after "Complete Capture." Loads the completed Guide from IndexedDB, allows the Recorder to delete/reorder/edit Steps and set the Guide title and description, then triggers Export.

A fifth surface is the **Popup** (`popup.html/js`) — entry point for starting a new Recording Session and accessing Guide History.

## Key technical decisions

- **Storage**: IndexedDB (not `chrome.storage.local`) for Guide data. The manifest must include `"unlimitedStorage"` permission. Screenshots are stored as compressed JPEG blobs (~100–200KB each), not base64 PNG strings.
- **Annotated Screenshots**: The highlight circle is drawn in the background service worker using `OffscreenCanvas` — not in the content script — because `captureVisibleTab` must be called from the background.
- **Export system**: Each format (PDF, DOCX, HTML, Markdown) is a separate module that takes a `Guide` object and returns a `Blob`. Adding a new format means adding one module and one entry in the format registry — nothing else changes.
- **AI descriptions**: Opt-in, two auth paths. Google Gemini uses Google OAuth 2.0 (one-click, no key pasting — recommended). All other providers (OpenAI, Mistral, etc.) use BYOK: the Recorder pastes their API key, stored in `chrome.storage.local`. Both paths fall back silently to rule-based generation. Anthropic OAuth is not available for third-party apps. See `docs/adr/0002-byok-ai-descriptions.md`.
- **No backend**: All data stays on the user's machine. See `docs/adr/0001-no-backend-file-based-sharing.md`.

## Chrome Manifest V3 constraints to keep in mind

- The background service worker is ephemeral — it can be killed by Chrome at any time. Do not hold session state in memory; persist to IndexedDB immediately on each Step capture.
- `chrome.tabs.captureVisibleTab` requires the `"activeTab"` or `"tabs"` permission and can only be called from the background service worker, not from content scripts.
- The Side Panel requires `"sidePanel"` permission and `chrome.sidePanel.setPanelBehavior`.
- Content scripts cannot use `OffscreenCanvas` directly; pass image processing work to the background via message passing.
