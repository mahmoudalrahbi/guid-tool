import { getAllGuidesWithStepCounts, deleteGuide } from "./db.js";

const startBtn = document.getElementById("startBtn");
const startBtnText = document.getElementById("startBtnText");
const historyList = document.getElementById("historyList");
const emptyHistory = document.getElementById("emptyHistory");
const guideCountEl = document.getElementById("guideCount");
const storageReadout = document.getElementById("storageReadout");

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  startBtnText.textContent = "Starting…";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.runtime.sendMessage({ type: MSG_START_RECORDING, tabId: tab.id }, (res) => {
    if (res?.ok) {
      window.close();
    } else {
      startBtnText.textContent = "Failed to start";
      startBtn.disabled = false;
    }
  });
});

async function calculateStorage() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const mb = (estimate.usage / (1024 * 1024)).toFixed(1);
    storageReadout.textContent = `${mb} MB · IndexedDB`;
    
    if (estimate.usage / estimate.quota > 0.8) {
      storageReadout.style.color = "var(--amber)";
    }
  } else {
    storageReadout.textContent = `IndexedDB Storage`;
  }
}

async function renderHistory() {
  const guides = await getAllGuidesWithStepCounts();
  historyList.innerHTML = "";
  guideCountEl.textContent = guides.length;
  
  if (guides.length === 0) {
    emptyHistory.style.display = "block";
    return;
  }
  
  emptyHistory.style.display = "none";

  for (const guide of guides) {
    const stepCount = guide.stepCount;
    
    const dateStr = formatDate(guide.lastActivityAt);

    const item = document.createElement("div");
    item.className = "guide-row";
    
    item.innerHTML = `
      <div class="guide-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2.5" y="2" width="11" height="12" rx="1.5"/>
          <path d="M5 5.5h6M5 8h6M5 10.5h4"/>
        </svg>
      </div>
      <div style="min-width:0;">
        <div class="guide-title" title="${escapeHtml(guide.title || 'Untitled Guide')}">${escapeHtml(guide.title || "Untitled Guide")}</div>
        <div class="guide-meta"><span>${stepCount} Step${stepCount !== 1 ? 's' : ''}</span><span class="sep"></span><span>${dateStr}</span></div>
      </div>
      <div class="chev">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 3 L7.5 6 L4.5 9"/></svg>
      </div>
      <div class="guide-actions">
        <button class="ico-btn delete-btn" title="Delete guide" style="width:24px; height:24px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
      </div>
    `;

    item.addEventListener("click", () => {
      const editorUrl = chrome.runtime.getURL(`editor.html?guideId=${guide.id}`);
      chrome.tabs.create({ url: editorUrl });
      window.close();
    });

    const deleteBtn = item.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${guide.title || "Untitled Guide"}" and all its steps?`)) {
        await deleteGuide(guide.id);
        await renderHistory();
        await calculateStorage();
      }
    });

    historyList.appendChild(item);
  }
}


calculateStorage();
renderHistory();
