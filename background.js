// Background service worker — orchestrates Recording Sessions.
// Persists state to chrome.storage.local (not memory) so SW restarts are safe.

importScripts("config.js", "messages.js", "db-core.js", "utils.js");

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === MSG_START_RECORDING) {
    handleStartRecording(msg.tabId).then(sendResponse);
    return true;
  }
  if (msg.type === MSG_CLICK_CAPTURED) {
    handleClickCaptured(msg.metadata);
    return false;
  }
  if (msg.type === MSG_COMPLETE_CAPTURE) {
    handleCompleteCapture().then(sendResponse);
    return true;
  }
  if (msg.type === MSG_PAUSE_RECORDING) {
    handlePauseRecording().then(sendResponse);
    return true;
  }
  if (msg.type === MSG_RESUME_RECORDING) {
    handleResumeRecording().then(sendResponse);
    return true;
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const { session } = await chrome.storage.local.get("session");
  if (!session?.active || session.tabId !== tabId) return;

  if (changeInfo.status === "complete") {
    await chrome.tabs.sendMessage(tabId, { type: MSG_RECORDING_STARTED, paused: session.paused }).catch(() => {});
  }

  if (session.paused) return;

  if (tab.status === "complete" && tab.url !== session.lastUrl && !tab.url.startsWith("chrome://")) {
    const newUrl = tab.url;
    await chrome.storage.local.set({ session: { ...session, lastUrl: newUrl } });

    setTimeout(async () => {
      const { session: currentSession } = await chrome.storage.local.get("session");
      if (!currentSession?.active) return;

      let screenshotDataUrl;
      try {
        screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, { format: CONFIG.CAPTURE_FORMAT, quality: CONFIG.CAPTURE_QUALITY });
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
        url: newUrl,
      };

      await saveStep(step);
      await chrome.storage.local.set({ session: { ...currentSession, stepCount } });

      chrome.runtime.sendMessage({ type: MSG_STEP_ADDED, step: { ...step, screenshotBlob: undefined, screenshotDataUrl } }).catch(() => {});
    }, CONFIG.UI_NAV_DELAY_MS);
  }
});

async function handleStartRecording(tabId) {
  // MUST open the side panel immediately to preserve the user gesture token!
  await chrome.sidePanel.open({ tabId });
  await chrome.sidePanel.setOptions({ tabId, path: "sidepanel.html", enabled: true });

  const guideId = `guide-${Date.now()}`;
  const tab = await chrome.tabs.get(tabId);

  await chrome.storage.local.set({
    session: { guideId, tabId, stepCount: 0, active: true, lastUrl: tab.url, paused: false },
  });

  await saveGuide({ id: guideId, title: "Untitled Guide", createdAt: Date.now(), url: tab.url });

  // Tell content script on that tab to start listening
  await chrome.tabs.sendMessage(tabId, { type: MSG_RECORDING_STARTED, paused: false }).catch(() => {});

  return { ok: true };
}

async function handlePauseRecording() {
  const { session } = await chrome.storage.local.get("session");
  if (!session?.active) return { ok: false };
  await chrome.storage.local.set({ session: { ...session, paused: true } });
  await chrome.tabs.sendMessage(session.tabId, { type: MSG_RECORDING_PAUSED }).catch(() => {});
  return { ok: true };
}

async function handleResumeRecording() {
  const { session } = await chrome.storage.local.get("session");
  if (!session?.active) return { ok: false };
  await chrome.storage.local.set({ session: { ...session, paused: false } });
  await chrome.tabs.sendMessage(session.tabId, { type: MSG_RECORDING_RESUMED }).catch(() => {});
  return { ok: true };
}

async function handleClickCaptured(metadata) {
  const { session } = await chrome.storage.local.get("session");
  if (!session?.active || session.paused) return;

  // Capture screenshot before anything else — timing is critical
  let screenshotDataUrl;
  try {
    screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, { format: CONFIG.CAPTURE_FORMAT, quality: CONFIG.CAPTURE_QUALITY });
  } catch {
    return; // Tab not capturable (e.g. chrome:// page)
  }

  // Draw highlight circle over click coordinates using OffscreenCanvas
  const annotated = await annotateScreenshot(screenshotDataUrl, metadata.x, metadata.y, metadata.dpr);

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
    url: session.lastUrl,
  };

  await saveStep(step);
  await chrome.storage.local.set({ session: { ...session, stepCount } });

  // Notify side panel
  chrome.runtime.sendMessage({ type: MSG_STEP_ADDED, step: { ...step, screenshotBlob: undefined, screenshotDataUrl: annotated } }).catch(() => {});
}

async function handleCompleteCapture() {
  const { session } = await chrome.storage.local.get("session");
  if (!session) return { ok: false };

  await chrome.storage.local.set({ session: { ...session, active: false } });

  // Tell content script to stop
  await chrome.tabs.sendMessage(session.tabId, { type: MSG_RECORDING_STOPPED }).catch(() => {});

  // Open Editor in new tab
  const editorUrl = chrome.runtime.getURL(`editor.html?guideId=${session.guideId}`);
  await chrome.tabs.create({ url: editorUrl });

  return { ok: true };
}

async function annotateScreenshot(dataUrl, x, y, dpr) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);

  // Scale click coords to device pixel ratio (screenshots are at devicePixelRatio)
  const cx = x * dpr;
  const cy = y * dpr;
  const r = CONFIG.ANNOTATION.RADIUS_PX * dpr;

  ctx.strokeStyle = CONFIG.ANNOTATION.COLOR;
  ctx.lineWidth = CONFIG.ANNOTATION.STROKE_WIDTH_PX * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.stroke();

  const outBlob = await canvas.convertToBlob({ type: `image/${CONFIG.CAPTURE_FORMAT}`, quality: CONFIG.ANNOTATED_QUALITY });
  return blobToDataUrl(outBlob);
}

function ruleBasedDescription(meta) {
  const label = meta.label || meta.text || meta.tag;
  const role = meta.role ? ` (${meta.role})` : "";
  return `Click "${label}"${role}`;
}
