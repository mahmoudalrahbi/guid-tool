// Content script. Injected into every tab. Captures clicks during a Recording
// Session and forwards element metadata + click coordinates to the background.

(function () {
  if (!chrome?.runtime?.sendMessage) return;

  let captureReady = true;
  const DEBOUNCE_MS = 300;

  document.addEventListener('click', (event) => {
    if (!chrome?.runtime?.sendMessage) return;
    if (!captureReady) return;
    captureReady = false;
    setTimeout(() => { captureReady = true; }, DEBOUNCE_MS);

    const elementMetadata = (self.LocalGuide && self.LocalGuide.extractElementMetadata)
      ? self.LocalGuide.extractElementMetadata(event.target)
      : { tagName: event.target ? event.target.tagName : '' };

    const message = {
      action: 'capture_click',
      elementMetadata,
      x: event.clientX,
      y: event.clientY,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };

    chrome.runtime.sendMessage(message).catch(() => {
      // chrome.runtime can be torn down if the extension is reloaded mid-session;
      // swallow the rejection so the host page is unaffected.
    });
  }, true);
})();
