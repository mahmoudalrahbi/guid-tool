const btn = document.getElementById("startBtn");
const status = document.getElementById("status");

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
