const stepsList = document.getElementById("steps");
const emptyMsg = document.getElementById("empty");
const completeBtn = document.getElementById("completeBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const header = document.getElementById("header");

chrome.storage.local.get("session", ({ session }) => {
  if (session?.paused) {
    setPausedUI();
  }
});

function setPausedUI() {
  pauseBtn.style.display = "none";
  resumeBtn.style.display = "block";
  header.textContent = "Paused";
}

function setResumedUI() {
  pauseBtn.style.display = "block";
  resumeBtn.style.display = "none";
  header.textContent = "Recording…";
}

pauseBtn.addEventListener("click", () => {
  setPausedUI();
  chrome.runtime.sendMessage({ type: "PAUSE_RECORDING" });
});

resumeBtn.addEventListener("click", () => {
  setResumedUI();
  chrome.runtime.sendMessage({ type: "RESUME_RECORDING" });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STEP_ADDED") {
    addStepToList(msg.step);
  }
});

completeBtn.addEventListener("click", () => {
  completeBtn.disabled = true;
  completeBtn.textContent = "Finishing…";
  chrome.runtime.sendMessage({ type: "COMPLETE_CAPTURE" });
});

function addStepToList(step) {
  emptyMsg.style.display = "none";
  const li = document.createElement("li");
  const img = document.createElement("img");
  img.src = step.screenshotDataUrl;
  img.alt = `Step ${step.order}`;
  const span = document.createElement("span");
  span.textContent = `${step.order}. ${step.description}`;
  li.appendChild(img);
  li.appendChild(span);
  stepsList.appendChild(li);
}
