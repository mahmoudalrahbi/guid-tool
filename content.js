// Injected into every tab. Listens for clicks and forwards element metadata
// to the background service worker during an active Recording Session.

let recording = false;
let paused = false;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "RECORDING_STARTED") {
    recording = true;
    paused = msg.paused || false;
  }
  if (msg.type === "RECORDING_STOPPED") recording = false;
  if (msg.type === "RECORDING_PAUSED") paused = true;
  if (msg.type === "RECORDING_RESUMED") paused = false;
});

document.addEventListener("click", (e) => {
  if (!recording || paused) return;

  const el = e.target;
  const metadata = {
    tag: el.tagName.toLowerCase(),
    text: (el.innerText || el.textContent || "").trim().slice(0, 120),
    label: el.getAttribute("aria-label") || "",
    role: el.getAttribute("role") || "",
    x: e.clientX,
    y: e.clientY,
  };

  chrome.runtime.sendMessage({ type: "CLICK_CAPTURED", metadata });
}, true);
