import { getAllGuides, getStepsForGuide, deleteGuide } from "./db.js";

const btn = document.getElementById("startBtn");
const status = document.getElementById("status");
const historyList = document.getElementById("historyList");
const emptyState = document.getElementById("emptyState");

btn.addEventListener("click", async () => {
  btn.disabled = true;
  status.textContent = "Starting…";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.runtime.sendMessage({ type: "START_RECORDING", tabId: tab.id }, (res) => {
    if (res?.ok) {
      status.textContent = "Recording started — side panel open.";
      window.close();
    } else {
      status.textContent = "Failed to start. Try reloading the extension.";
      btn.disabled = false;
    }
  });
});

async function renderHistory() {
  const guides = await getAllGuides();
  historyList.innerHTML = "";
  
  if (guides.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  
  emptyState.style.display = "none";
  
  // Sort newest first
  guides.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

  for (const guide of guides) {
    // Fetch step count. We do this for each guide so it's accurate.
    const steps = await getStepsForGuide(guide.id);
    const stepCount = steps.length;
    
    const date = new Date(guide.updatedAt || guide.createdAt).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });

    const item = document.createElement("div");
    item.className = "guide-item";
    
    item.innerHTML = `
      <div class="guide-info">
        <div class="guide-name" title="${guide.title}">${escapeHtml(guide.title || "Untitled Guide")}</div>
        <div class="guide-meta">${stepCount} step${stepCount !== 1 ? 's' : ''} • ${date}</div>
      </div>
      <button class="delete-btn" title="Delete guide">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
      </button>
    `;

    // Click to re-open
    item.addEventListener("click", () => {
      const editorUrl = chrome.runtime.getURL(`editor.html?guideId=${guide.id}`);
      chrome.tabs.create({ url: editorUrl });
      window.close();
    });

    // Delete
    const deleteBtn = item.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation(); // Prevent opening the guide
      if (confirm(`Delete "${guide.title || "Untitled Guide"}" and all its steps?`)) {
        await deleteGuide(guide.id);
        renderHistory();
      }
    });

    historyList.appendChild(item);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

renderHistory();
