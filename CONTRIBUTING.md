# Contributing to LocalGuide

Thank you for contributing. Please read this before opening a PR.

## Before you start

- Read [`CONTEXT.md`](CONTEXT.md) for the domain glossary. Use those terms precisely in code, comments, and PR descriptions — Guide, Step, Recording Session, Annotated Screenshot, Editor, Recorder, Reader.
- Scan [`docs/adr/`](docs/adr/) for relevant architecture decisions. Don't work around them without opening a discussion first.

## Setup

```bash
git clone <repo>
cd guid-tool
npm install
```

Load the extension in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this directory

Run tests:

```bash
npm test
```

## Workflow

1. **Open an issue first** for any non-trivial change. Describe the problem and your proposed approach.
2. Fork the repository and create a branch from `main`.
3. Make your changes. Keep each PR focused on one thing.
4. Ensure `npm test` passes before opening a PR.
5. Open a PR against `main` and fill in the PR template.

## Code style

- Plain JavaScript (no TypeScript, no build step). This is intentional — the extension loads directly in Chrome.
- No framework. Vanilla DOM for all UI surfaces.
- Tests live alongside source files as `*.test.js`.
- No comments unless the *why* is genuinely non-obvious.

## Chrome MV3 constraints

Keep these in mind when touching background or content script code:

- The background service worker is ephemeral. Never hold session state in memory — persist to IndexedDB immediately.
- `chrome.tabs.captureVisibleTab` can only be called from the background service worker.
- Image compositing happens in the Editor context, not the background.

## Adding an export format

1. Create a module in `exports/` that accepts a `Guide` object and returns a `Blob`.
2. Register it in the format registry (see `exports/index.js`).
3. Nothing else changes — the Editor's export UI picks it up automatically.

## Pull request checklist

- [ ] `npm test` passes
- [ ] Domain terms from `CONTEXT.md` are used correctly
- [ ] No new in-memory session state in the background service worker
- [ ] PR description explains *why*, not just *what*

## Reporting bugs

Use the **Bug report** issue template. Include:
- Chrome version
- Steps to reproduce
- What you expected vs. what happened
- Any relevant console errors from `chrome://extensions` → service worker → Inspect
