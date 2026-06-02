// Background service worker — entry point only.
// Recording Session logic lives in recording-controller.js.
// Persists state to chrome.storage.local (not memory) so SW restarts are safe.

importScripts("config.js", "messages.js", "db-core.js", "utils.js", "describer.js", "step-capture.js", "recording-session.js", "recording-controller.js");

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

var ctrl = createRecordingController({
  storage: {
    get: (key) => chrome.storage.local.get(key),
    set: (obj) => chrome.storage.local.set(obj),
  },
  tabs: {
    get: (tabId) => chrome.tabs.get(tabId),
    sendMessage: (tabId, msg) => chrome.tabs.sendMessage(tabId, msg),
    create: (opts) => chrome.tabs.create(opts),
  },
  sidePanel: {
    open: (opts) => chrome.sidePanel.open(opts),
    setOptions: (opts) => chrome.sidePanel.setOptions(opts),
  },
  runtime: {
    getURL: (path) => chrome.runtime.getURL(path),
    sendMessage: (msg) => chrome.runtime.sendMessage(msg),
  },
  buildStepCapture: buildStepCapture,
  db: { saveGuide },
  config: CONFIG,
});

chrome.runtime.onMessage.addListener(createRouter({
  [MSG_START_RECORDING]: (msg, _sender, sendResponse) => {
    ctrl.handleStartRecording(msg.tabId).then(sendResponse);
    return true;
  },
  [MSG_CLICK_CAPTURED]: (msg) => {
    ctrl.handleClickCaptured(msg.metadata);
  },
  [MSG_COMPLETE_CAPTURE]: (_msg, _sender, sendResponse) => {
    ctrl.handleCompleteCapture().then(sendResponse);
    return true;
  },
  [MSG_PAUSE_RECORDING]: (_msg, _sender, sendResponse) => {
    ctrl.handlePauseRecording().then(sendResponse);
    return true;
  },
  [MSG_RESUME_RECORDING]: (_msg, _sender, sendResponse) => {
    ctrl.handleResumeRecording().then(sendResponse);
    return true;
  },
}));

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  ctrl.handleTabUpdate(tabId, changeInfo, tab);
});
