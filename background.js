// Background service worker — orchestrates Recording Sessions.
// Persists state to chrome.storage.local (not memory) so SW restarts are safe.

importScripts("db-sw.js");

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "START_RECORDING") {
    handleStartRecording(msg.tabId).then(sendResponse);
    return true;
  }
  if (msg.type === "CLICK_CAPTURED") {
    handleClickCaptured(msg.metadata);
    return false;
  }
  if (msg.type === "COMPLETE_CAPTURE") {
    handleCompleteCapture().then(sendResponse);
    return true;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const { session } = await chrome.storage.local.get("session");
  if (!session?.active || session.tabId !== tabId) return;

  if (changeInfo.status === "complete") {
    await chrome.tabs.sendMessage(tabId, { type: "RECORDING_STARTED" }).catch(() => {});
  }

  if (tab.status === "complete" && tab.url !== session.lastUrl && !tab.url.startsWith("chrome://")) {
    const newUrl = tab.url;
    await chrome.storage.local.set({ session: { ...session, lastUrl: newUrl } });

    setTimeout(async () => {
      const { session: currentSession } = await chrome.storage.local.get("session");
      if (!currentSession?.active) return;

      let screenshotDataUrl;
      try {
        screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 80 });
      } catch {
        return; // Tab not capturable
      }

      const blob = dataUrlToBlob(screenshotDataUrl);
      const stepCount = currentSession.stepCount + 1;
      const step = {
        id: `step-${currentSession.guideId}-${stepCount}`,
        guideId: currentSession.guideId,
        order: stepCount,
        description: `Navigated to ${newUrl}`,
        screenshotBlob: blob,
        createdAt: Date.now(),
      };

      await saveStep(step);
      await chrome.storage.local.set({ session: { ...currentSession, stepCount } });

      chrome.runtime.sendMessage({ type: "STEP_ADDED", step: { ...step, screenshotBlob: undefined, screenshotDataUrl } }).catch(() => {});
    }, 500);
  }
});

async function handleStartRecording(tabId) {
  // MUST open the side panel immediately to preserve the user gesture token!
  await chrome.sidePanel.open({ tabId });
  await chrome.sidePanel.setOptions({ tabId, path: "sidepanel.html", enabled: true });

  const guideId = `guide-${Date.now()}`;
  const tab = await chrome.tabs.get(tabId);

  await chrome.storage.local.set({
    session: { guideId, tabId, stepCount: 0, active: true, lastUrl: tab.url },
  });

  await saveGuide({ id: guideId, title: "Untitled Guide", createdAt: Date.now() });

  // Tell content script on that tab to start listening
  await chrome.tabs.sendMessage(tabId, { type: "RECORDING_STARTED" }).catch(() => {});

  return { ok: true };
}

async function handleClickCaptured(metadata) {
  const { session } = await chrome.storage.local.get("session");
  if (!session?.active) return;

  // Capture screenshot before anything else — timing is critical
  let screenshotDataUrl;
  try {
    screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 80 });
  } catch {
    return; // Tab not capturable (e.g. chrome:// page)
  }

  // Draw highlight circle over click coordinates using OffscreenCanvas
  const annotated = await annotateScreenshot(screenshotDataUrl, metadata.x, metadata.y);

  // Convert data URL → Blob for compact IndexedDB storage
  const blob = dataUrlToBlob(annotated);

  const stepCount = session.stepCount + 1;
  const step = {
    id: `step-${session.guideId}-${stepCount}`,
    guideId: session.guideId,
    order: stepCount,
    description: ruleBasedDescription(metadata),
    screenshotBlob: blob,
    createdAt: Date.now(),
  };

  await saveStep(step);
  await chrome.storage.local.set({ session: { ...session, stepCount } });

  // Notify side panel
  chrome.runtime.sendMessage({ type: "STEP_ADDED", step: { ...step, screenshotBlob: undefined, screenshotDataUrl: annotated } }).catch(() => {});
}

async function handleCompleteCapture() {
  const { session } = await chrome.storage.local.get("session");
  if (!session) return { ok: false };

  await chrome.storage.local.set({ session: { ...session, active: false } });

  // Tell content script to stop
  await chrome.tabs.sendMessage(session.tabId, { type: "RECORDING_STOPPED" }).catch(() => {});

  // Open Editor in new tab
  const editorUrl = chrome.runtime.getURL(`editor.html?guideId=${session.guideId}`);
  await chrome.tabs.create({ url: editorUrl });

  return { ok: true };
}

async function annotateScreenshot(dataUrl, x, y) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);

  // Scale click coords to device pixel ratio (screenshots are at devicePixelRatio)
  const dpr = self.devicePixelRatio || 1;
  const cx = x * dpr;
  const cy = y * dpr;
  const r = 28 * dpr;

  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 3 * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.stroke();

  const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
  return blobToDataUrl(outBlob);
}

function ruleBasedDescription(meta) {
  const label = meta.label || meta.text || meta.tag;
  const role = meta.role ? ` (${meta.role})` : "";
  return `Click "${label}"${role}`;
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
