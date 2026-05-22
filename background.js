// Service worker. Owns the Recording Session lifecycle:
//  - listens for start_recording from the Popup,
//  - listens for capture_click from the Content Script,
//  - takes the visible-tab screenshot, annotates it, writes a Step to IndexedDB,
//  - listens for complete_capture from the Side Panel, opens the Editor.

importScripts('src/description.js', 'src/db.js', 'src/annotate.js');

const STORAGE_KEY_SESSION = 'currentSession';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
});

async function getCurrentSession() {
  const data = await chrome.storage.local.get(STORAGE_KEY_SESSION);
  return data[STORAGE_KEY_SESSION] || null;
}

async function setCurrentSession(session) {
  await chrome.storage.local.set({ [STORAGE_KEY_SESSION]: session });
}

async function clearCurrentSession() {
  await chrome.storage.local.remove(STORAGE_KEY_SESSION);
}

async function handleStartRecording(tabId, windowId) {
  const guide = await self.LocalGuide.createGuide({ title: 'Untitled Guide' });
  await setCurrentSession({ guideId: guide.id, status: 'recording', startedAt: Date.now() });

  if (typeof windowId === 'number') {
    try {
      await chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true });
      await chrome.sidePanel.open({ windowId });
    } catch (e) {
      // setOptions may fail if tabId is undefined; that's fine in MV3.
    }
  }
  return { guideId: guide.id };
}

async function captureAnnotatedScreenshot(tabId, clickContext) {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
  const response = await fetch(dataUrl);
  const sourceBlob = await response.blob();
  return self.LocalGuide.annotateScreenshot(sourceBlob, clickContext);
}

async function handleCaptureClick(message, sender) {
  const session = await getCurrentSession();
  if (!session || session.status !== 'recording') {
    return { success: true, captured: false, reason: 'not_recording' };
  }

  const annotatedBlob = await captureAnnotatedScreenshot(
    sender.tab && sender.tab.id,
    {
      x: message.x,
      y: message.y,
      viewportWidth: message.viewportWidth,
      viewportHeight: message.viewportHeight,
    },
  );

  const description = self.LocalGuide.describeStep(message.elementMetadata);

  const step = await self.LocalGuide.addStep(session.guideId, {
    description,
    screenshotBlob: annotatedBlob,
    elementMetadata: message.elementMetadata,
  });

  // Side panel listens for this broadcast and refreshes.
  chrome.runtime.sendMessage({ action: 'step_added', guideId: session.guideId, stepId: step.id })
    .catch(() => {});

  return { success: true, captured: true, stepId: step.id };
}

async function handleCompleteCapture() {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: 'no_active_session' };

  await setCurrentSession({ ...session, status: 'completed', completedAt: Date.now() });
  const editorUrl = chrome.runtime.getURL(`editor.html?guideId=${encodeURIComponent(session.guideId)}`);
  await chrome.tabs.create({ url: editorUrl });
  await clearCurrentSession();
  return { success: true, guideId: session.guideId };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    sendResponse({ success: false, error: 'invalid_message' });
    return false;
  }

  const handler = (async () => {
    try {
      switch (message.action) {
        case 'start_recording':
          return handleStartRecording(message.tabId, message.windowId);
        case 'capture_click':
          return handleCaptureClick(message, sender);
        case 'complete_capture':
          return handleCompleteCapture();
        case 'get_session':
          return { success: true, session: await getCurrentSession() };
        default:
          return { success: false, error: 'unknown_action' };
      }
    } catch (err) {
      console.error('LocalGuide background error:', err);
      return { success: false, error: err && err.message ? err.message : String(err) };
    }
  })();

  handler.then(sendResponse);
  return true;
});
