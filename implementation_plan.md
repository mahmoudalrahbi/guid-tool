# Implementation Plan: Decompose editor.js (Slice 19)

## Goal
Decompose the monolithic `editor.js` file into smaller, modular components to improve maintainability. We will extract UI and behavior logic (toast notifications, drag-and-drop, step cards, and export menu) into pure-ish ES modules inside a new `editor/` directory, leaving `editor.js` as the central state manager and orchestrator.

## User Review Required
- Is the new `editor/` subdirectory approach acceptable for organizing these components, or should they be kept at the root alongside `editor.js`?
- I plan to use a callback injection pattern (e.g., passing `onDelete` to the step card component) to avoid circular dependencies between components and the state in `editor.js`. Let me know if you prefer a different state management approach (like an EventBus or dedicated state module).

## Proposed Changes

We will create a new directory `editor/` to house the extracted components.

### 1. Extract Toast Component
#### [NEW] `editor/toast.js`
- Move the `showToast` function here.
- Refactor to accept `toastHost` as a parameter to decouple it from the global DOM variable.
- `export function showToast(toastHost, msg, undoFn = null)`

### 2. Extract Export Menu Component
#### [NEW] `editor/export-menu.js`
- Move `renderExportMenu` and the export dropdown toggling logic here.
- Decouple from `currentGuide` and `currentSteps` by accepting an `onExport(formatId)` callback.
- `export function setupExportMenu(exportMenu, exportDropdown, exportBtn, formats, onExport)`

### 3. Extract Step Card Component
#### [NEW] `editor/step-card.js`
- Move `createStepElement`, `autoSize`, and `renumber` functions here.
- Decouple `createStepElement` from global state by accepting callbacks.
- `export function createStepElement(step, { onDescChange, onDelete, onUndoDelete })`
- `export function renumber(stepsList, stepCountBadge)`

### 4. Extract Drag and Drop Component
#### [NEW] `editor/drag-drop.js`
- Move `attachDragAndDrop`, `autoScroll`, and drag-related event listeners here.
- Decouple from state synchronization by accepting an `onReorder` callback triggered on successful drop.
- `export function attachDragAndDrop(stepsList, onReorder)`

### 5. Update main orchestrator
#### [MODIFY] `editor.js`
- Act as the central orchestrator and state manager.
- Import components from the `./editor/` directory.
- Pass the necessary DOM elements and callbacks to the imported functions to maintain state (e.g., updating `currentSteps`, calling `flashSaving()`, and `deleteStep()`).

## Verification Plan

### Automated Tests
- As per the handoff document, TDD should be used where applicable. We can write unit tests for the extracted pure-ish components (e.g., `toast.js`, `step-card.js`) using the test runner established in Slice 14, mocking DOM elements where necessary.

### Manual Verification
- Open the Editor view (`editor.html`) in the browser.
- Verify that steps render correctly with titles, descriptions, and annotated screenshots.
- Test editing a step description and confirm it triggers an auto-save.
- Test deleting a step, confirming the toast appears, and test the "Undo" functionality.
- Test dragging and dropping steps to reorder them, confirming the numbers update and state is saved.
- Test opening the Export menu and triggering an export.
