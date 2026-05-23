const stepsList = document.getElementById("stepsList");
const emptyState = document.getElementById("emptyState");
const completeBtn = document.getElementById("completeBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");

const headerSub = document.getElementById("headerSub");
const statusRow = document.getElementById("statusRow");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const stepCountEl = document.getElementById("stepCount");
const pausedBanner = document.getElementById("pausedBanner");
const footer = document.getElementById("footer");

let currentStepCount = 0;

chrome.storage.local.get("session", ({ session }) => {
  if (session) {
    currentStepCount = session.stepCount || 0;
    stepCountEl.textContent = currentStepCount;
    if (currentStepCount > 0) {
      emptyState.style.display = "none";
      footer.classList.remove("idle");
      completeBtn.disabled = false;
      completeBtn.className = "btn btn-primary btn-full";
      pauseBtn.style.display = "inline-flex";
    }
  }

  if (session?.paused) {
    setPausedUI();
  } else {
    setRecordingUI();
  }
});

function setPausedUI() {
  pauseBtn.style.display = "none";
  resumeBtn.style.display = "inline-flex";
  completeBtn.className = "btn btn-secondary";
  
  headerSub.textContent = "paused";
  statusRow.className = "status-row is-paused";
  statusDot.className = "rec-dot paused";
  statusText.textContent = "Paused";
  statusText.style.color = "var(--text-2)";
  
  pausedBanner.style.display = "flex";
}

function setRecordingUI() {
  if (currentStepCount > 0) {
    pauseBtn.style.display = "inline-flex";
  }
  resumeBtn.style.display = "none";
  completeBtn.className = "btn btn-primary btn-full";
  
  headerSub.textContent = "capturing";
  statusRow.className = "status-row";
  statusDot.className = "rec-dot";
  statusText.textContent = "Recording";
  statusText.style.color = "var(--text-1)";
  
  pausedBanner.style.display = "none";
}

pauseBtn.addEventListener("click", () => {
  setPausedUI();
  chrome.runtime.sendMessage({ type: "PAUSE_RECORDING" });
});

resumeBtn.addEventListener("click", () => {
  setRecordingUI();
  chrome.runtime.sendMessage({ type: "RESUME_RECORDING" });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STEP_ADDED") {
    addStepToList(msg.step);
  }
});

completeBtn.addEventListener("click", () => {
  completeBtn.disabled = true;
  completeBtn.innerHTML = "Finishing…";
  chrome.runtime.sendMessage({ type: "COMPLETE_CAPTURE" });
});

function addStepToList(step) {
  if (currentStepCount === 0) {
    emptyState.style.display = "none";
    footer.classList.remove("idle");
    completeBtn.disabled = false;
    completeBtn.className = "btn btn-primary btn-full";
    if (!statusRow.classList.contains("is-paused")) {
      pauseBtn.style.display = "inline-flex";
    }
    setRecordingUI();
  }
  
  currentStepCount++;
  stepCountEl.textContent = currentStepCount;

  const prevLatest = stepsList.querySelectorAll(".latest");
  prevLatest.forEach(el => el.classList.remove("latest"));

  const article = document.createElement("article");
  article.className = "step";
  
  let urlStr = "";
  if (step.url) {
    try {
      const url = new URL(step.url);
      urlStr = url.hostname + url.pathname;
    } catch {
      urlStr = step.url;
    }
  }

  article.innerHTML = `
    <div class="step-num latest">${step.order < 10 ? '0'+step.order : step.order}</div>
    <div class="step-body">
      <div class="step-thumb latest">
        <img src="${step.screenshotDataUrl}" alt="Step ${step.order}" />
      </div>
      <div class="step-desc">
        ${escapeHtml(step.description)}
        ${urlStr ? `<span class="url">${escapeHtml(urlStr)}</span>` : ""}
      </div>
    </div>
    <div class="actions">
      <button class="ico-btn" title="Edit"><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2 8.5V9.5h1L8.5 4 7.5 3z"/></svg></button>
      <button class="ico-btn" title="Delete"><svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2.5 3h6M4.5 5v3M6.5 5v3M3 3l.5 6.5h4L8 3"/></svg></button>
    </div>
  `;

  stepsList.appendChild(article);
  stepsList.scrollTop = stepsList.scrollHeight;
}

