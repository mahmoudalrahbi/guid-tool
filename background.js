// Background service worker — orchestrates Recording Sessions.
// Persists state to chrome.storage.local (not memory) so SW restarts are safe.

importScripts("config.js", "messages.js", "db-core.js", "utils.js", "describer.js", "step-capture.js");

var stepCapture = null;

function buildStepCapture() {
  return createStepCapture({
    screenshot: () => chrome.tabs.captureVisibleTab(null, { format: CONFIG.CAPTURE_FORMAT, quality: CONFIG.CAPTURE_QUALITY }),
    // Reload provider from storage on every call — survives SW restart without silently degrading.
    describer: async (metadata) => {
      var provider = await loadActiveProvider();
      return describe(metadata, provider);
    },
    db: { saveStep },
    broadcast: (msg) => chrome.runtime.sendMessage(msg).catch(() => {}),
  });
}

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

      if (!stepCapture) stepCapture = buildStepCapture();
      try {
        const { step } = await stepCapture.captureNavigation(newUrl, {
          tabId: currentSession.tabId,
          guideId: currentSession.guideId,
          stepCount: currentSession.stepCount,
        });
        await chrome.storage.local.set({ session: { ...currentSession, stepCount: step.order } });
      } catch {
        // Tab not capturable or db write failed — step silently dropped for navigation
      }
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

  stepCapture = buildStepCapture();

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

  if (!stepCapture) stepCapture = buildStepCapture();
  try {
    const { step } = await stepCapture.captureClick(metadata, {
      tabId: session.tabId,
      guideId: session.guideId,
      stepCount: session.stepCount,
      lastUrl: session.lastUrl,
    });
    await chrome.storage.local.set({ session: { ...session, stepCount: step.order } });
  } catch {
    // Tab not capturable or db write failed
  }
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
