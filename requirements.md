# LocalGuide - Project Requirements

## Project Overview
Goal: Build a Chrome extension that captures user workflows (clicks + screenshots) and generates a downloadable document (PDF/DOCX) entirely on the user's machine.

## Phase 1: The "Invisible" Capture (Core Engine)
Goal: Prove the extension can detect a click and take a screenshot without a server.
**Functional Requirements:**
- Manifest V3 Setup: Basic extension structure with permissions for activeTab, scripting, and storage.
- Event Listener: A content script that detects every click event on a webpage.
- Action Labeling: Logic to extract the name/ID of the element clicked (e.g., "Clicked 'Submit' button").
- Snapshot Trigger: On click, send a message to the background.js (Service Worker) to execute chrome.tabs.captureVisibleTab.
**Success Criteria:**
- Open Chrome DevTools Console.
- Click any button on a website.
- Result: The console logs: "Captured: Clicked [Button Name]" and a Base64 image string appears.

## Phase 2: Local Memory (The "Vault")
Goal: Store multiple steps locally and allow the user to view them.
**Functional Requirements:**
- Local Storage: Save the captured text and image strings into chrome.storage.local.
- Unlimited Storage: Add the unlimitedStorage permission to handle high-resolution screenshots.
- The Gallery View: A popup or side-panel UI that displays a list of the captured steps in chronological order.
- Session Management: "Start Recording" and "Stop Recording" buttons to control when data is gathered.
**Success Criteria:**
- Click "Start" in the extension popup.
- Perform 5 different clicks on a site.
- Click "Stop" and open the Gallery.
- Result: All 5 steps are visible with their respective screenshots and descriptions.

## Phase 3: The Document Builder (No-Hosting Export)
Goal: Convert the stored data into a file the user can keep.
**Functional Requirements:**
- Client-side PDF Library: Integrate jsPDF or pdf-lib (running entirely in the browser).
- Image-to-Page Logic: A script that iterates through the stored steps and draws the screenshot + text onto a PDF page.
- Direct Download: Use the chrome.downloads API or a "Blob" download link to trigger a "Save As" prompt on the user's computer.
**Success Criteria:**
- Click the "Export to PDF" button in the extension.
- Result: A PDF file is generated and downloaded instantly. The file contains the screenshots and instructions.

## Phase 4: Polish & Privacy (Advanced Features)
Goal: Make the tool professional and secure.
**Functional Requirements:**
- Sensitive Data Blur: A simple canvas-based tool in the Gallery view to let users "draw" a black box over sensitive info (passwords/emails) before exporting.
- Step Editor: Allow users to edit the auto-generated text (e.g., change "Clicked div" to "Navigate to Login").
- Image Compression: Implement a canvas resize to shrink screenshot file sizes, preventing the extension from becoming sluggish.
**Success Criteria:**
- Edit a step’s text in the Gallery.
- Blur a piece of information on a screenshot.
- Export the final version.
- Result: The downloaded PDF reflects all manual edits and blurs.
