// Leading-edge debounce: capture the first click in a 350ms window,
// drop follow-up clicks within that window (collapses accidental double-clicks).
let _captureReady = true;

document.addEventListener('click', (event) => {
  // chrome.runtime becomes undefined when the extension is reloaded while the
  // tab stays open (orphaned content script). Bail out silently in that case.
  if (!chrome?.runtime?.sendMessage) return;

  if (!_captureReady) return;
  _captureReady = false;
  setTimeout(() => { _captureReady = true; }, 350);

  const target = event.target;
  const elementInfo = LocalGuide.extractElementInfo(target);

  chrome.runtime.sendMessage({ action: 'capture_click', elementInfo }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('LocalGuide background error:', chrome.runtime.lastError);
      return;
    }

    if (!response) return;

    if (response.success && response.saved) {
      showCaptureFlash('Step captured', '#bb86fc');
    } else if (response.error === 'storage_full') {
      showCaptureFlash('Storage full — step not saved', '#cf6679');
    }
  });
}, true);

function showCaptureFlash(message, bgColor) {
  // Inject the keyframe animation once
  if (!document.getElementById('_lg-style')) {
    const s = document.createElement('style');
    s.id = '_lg-style';
    s.textContent = `@keyframes _lg-fade {
      0%, 70% { opacity: 1; transform: translateY(0); }
      100%     { opacity: 0; transform: translateY(-8px); }
    }`;
    (document.head || document.documentElement).appendChild(s);
  }

  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; top: 16px; right: 16px; z-index: 2147483647;
    background: ${bgColor}; color: #000;
    font: 600 13px system-ui, -apple-system, sans-serif;
    padding: 8px 16px; border-radius: 8px; pointer-events: none;
    animation: _lg-fade 1.4s ease forwards;
  `;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
