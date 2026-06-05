// recording-controller.js
// Testable factory that encapsulates Recording Session orchestration logic.
// All Chrome API surfaces are injected via deps — no direct chrome.* calls here.

var recordingSession = typeof require === 'function'
  ? require('./recording-session.js')
  : globalThis.RecordingSession;

var startSession     = recordingSession.startSession;
var recordStep       = recordingSession.recordStep;
var pauseSession     = recordingSession.pauseSession;
var resumeSession    = recordingSession.resumeSession;
var navigate         = recordingSession.navigate;
var completeSession  = recordingSession.completeSession;
var canCapture       = recordingSession.canCapture;

function createRecordingController(deps) {
  var storage = deps.storage;
  var tabs = deps.tabs;
  var sidePanel = deps.sidePanel;
  var runtime = deps.runtime;
  var buildStepCapture = deps.buildStepCapture;
  var db = deps.db;
  var config = deps.config;

  var stepCapture = null;

  function getStepCapture() {
    if (!stepCapture) {
      stepCapture = buildStepCapture();
    }
    return stepCapture;
  }

  async function handleStartRecording(tabId) {
    // MUST open side panel first — preserves user-gesture token
    await sidePanel.open({ tabId });
    await sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true });

    var guideId = 'guide-' + Date.now();
    var tab = await tabs.get(tabId);

    var session = startSession({ guideId, tabId, url: tab.url });
    await storage.set({ session });

    await db.saveGuide({ id: guideId, title: 'Untitled Guide', createdAt: Date.now(), url: tab.url });

    await tabs.sendMessage(tabId, { type: 'RECORDING_STARTED', paused: false }).catch(function() {});

    return { ok: true };
  }

  async function handleClickCaptured(metadata) {
    var result = await storage.get('session');
    var session = result.session;
    if (!session || !canCapture(session)) return;

    try {
      var capture = getStepCapture();
      var captureResult = await capture.captureClick(metadata, {
        tabId: session.tabId,
        guideId: session.guideId,
        stepCount: session.stepCount,
        lastUrl: session.lastUrl,
      });
      var nextSession = recordStep(session);
      nextSession = Object.assign({}, nextSession, { stepCount: captureResult.step.order });
      await storage.set({ session: nextSession });
    } catch (e) {
      // swallow — tab not capturable or db write failed
    }
  }

  async function handleCompleteCapture() {
    var result = await storage.get('session');
    var session = result.session;
    if (!session) return { ok: false };

    await storage.set({ session: completeSession(session) });

    await tabs.sendMessage(session.tabId, { type: 'RECORDING_STOPPED' }).catch(function() {});

    // The side panel closes itself via window.close() in sidepanel.js — a global
    // (manifest default_path) panel cannot be closed from the background.
    var editorUrl = runtime.getURL('editor.html?guideId=' + session.guideId);
    await tabs.create({ url: editorUrl });

    return { ok: true };
  }

  async function handlePauseRecording() {
    var result = await storage.get('session');
    var session = result.session;
    if (!session || !session.active) return { ok: false };

    await storage.set({ session: pauseSession(session) });
    await tabs.sendMessage(session.tabId, { type: 'RECORDING_PAUSED' }).catch(function() {});
    return { ok: true };
  }

  async function handleResumeRecording() {
    var result = await storage.get('session');
    var session = result.session;
    if (!session || !session.active) return { ok: false };

    await storage.set({ session: resumeSession(session) });
    await tabs.sendMessage(session.tabId, { type: 'RECORDING_RESUMED' }).catch(function() {});
    return { ok: true };
  }

  async function handleTabUpdate(tabId, changeInfo, tab) {
    var result = await storage.get('session');
    var session = result.session;
    if (!session || !session.active || session.tabId !== tabId) return;

    if (changeInfo.status === 'complete') {
      await tabs.sendMessage(tabId, { type: 'RECORDING_STARTED', paused: session.paused }).catch(function() {});
    }

    if (!canCapture(session)) return;

    if (tab.status === 'complete' && tab.url !== session.lastUrl && !tab.url.startsWith('chrome://')) {
      var newUrl = tab.url;
      await storage.set({ session: navigate(session, newUrl) });

      setTimeout(async function() {
        var latestResult = await storage.get('session');
        var currentSession = latestResult.session;
        if (!currentSession || !canCapture(currentSession)) return;

        try {
          var capture = getStepCapture();
          var captureResult = await capture.captureNavigation(newUrl, {
            tabId: currentSession.tabId,
            guideId: currentSession.guideId,
            stepCount: currentSession.stepCount,
          });
          await storage.set({ session: Object.assign({}, currentSession, { stepCount: captureResult.step.order }) });
        } catch (e) {
          // swallow — tab not capturable or db write failed for navigation
        }
      }, config.UI_NAV_DELAY_MS);
    }
  }

  return {
    handleStartRecording: handleStartRecording,
    handleClickCaptured: handleClickCaptured,
    handleCompleteCapture: handleCompleteCapture,
    handlePauseRecording: handlePauseRecording,
    handleResumeRecording: handleResumeRecording,
    handleTabUpdate: handleTabUpdate,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createRecordingController };
}
