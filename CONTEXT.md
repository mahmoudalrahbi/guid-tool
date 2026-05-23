# LocalGuide

A Chrome browser extension that lets a Recorder capture a browser workflow as an annotated, step-by-step document and export it as a file for sharing with teammates — with no server, no subscription, and no external storage.

## Language

**Guide**:
A named, step-by-step document capturing a browser workflow. Has a Title, a Description, and an ordered list of Steps.
_Avoid_: Document, tutorial, walkthrough, script

**Step**:
A single captured moment within a Guide — one Annotated Screenshot plus one text description.
_Avoid_: Slide, frame, capture, screenshot (a Step contains a screenshot, it is not one)

**Recording Session**:
The active period during which the extension is capturing Steps. Starts when the Recorder begins recording; ends when they click "Complete Capture."
_Avoid_: Session, capture session, recording

**Annotated Screenshot**:
A full-viewport screenshot with a colored highlight circle drawn over the clicked element, showing the Reader exactly where to act.
_Avoid_: Screenshot, snapshot, image (those miss the highlight annotation which is load-bearing)

**Popup**:
The browser action popup that opens when the Recorder clicks the extension icon. Entry point for starting a new Recording Session and viewing Guide History.
_Avoid_: Extension menu, toolbar menu, overlay

**Side Panel**:
The Chrome side panel UI that is open during a Recording Session. Shows captured Steps in real-time. Contains Pause and Complete Capture controls.
_Avoid_: Popup, sidebar, panel

**Editor**:
The full-page view that opens in a new tab after "Complete Capture." The Recorder uses it to delete, reorder, and edit Steps before exporting.
_Avoid_: Gallery, review screen, preview

**Export**:
Converting a completed Guide into a downloadable file. Supported formats: PDF, DOCX, HTML, Markdown. The format system is extensible.
_Avoid_: Download, save, generate

**Guide History**:
The locally-stored list of all saved Guides, persisted in IndexedDB. Accessible from the extension popup. Allows the Recorder to re-open any past Guide.
_Avoid_: Library, archive, saved guides, storage

**Recorder**:
The person using the extension to create a Guide.
_Avoid_: User, author, creator

**Reader**:
The person who receives the exported file and follows the Guide.
_Avoid_: User, viewer, recipient

**BYOK (Bring Your Own Key)**:
The pattern by which a Recorder supplies their own AI provider API key in extension settings to enable AI-generated Step descriptions. Falls back to rule-based generation when no key is configured.
_Avoid_: AI integration, API key mode, optional AI

## Example dialogue

> **Recorder**: I finished the Recording Session but one Step has the wrong description.
>
> **Teammate**: Open the Editor — you can edit any Step's text there before you Export.
>
> **Recorder**: And the Annotated Screenshot shows the wrong element highlighted?
>
> **Teammate**: You'd need to re-record that Step. The Annotated Screenshot is captured at the moment of the click — the Editor can't change it, only delete the Step entirely.
>
> **Recorder**: Got it. I'll delete the bad Step, re-record that part, and merge it in manually.
>
> **Teammate**: Once you're happy, Export as HTML and share the file in Slack. The Reader just opens it in their browser.
