const stepsList = document.getElementById("steps");
const emptyMsg = document.getElementById("empty");
const completeBtn = document.getElementById("completeBtn");

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
