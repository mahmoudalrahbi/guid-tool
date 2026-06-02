// recording-session.js
// Pure reducer for Recording Session state and transitions.
// No chrome.*, no storage, no async — all I/O stays in recording-controller.js.

function startSession({ guideId, tabId, url }) {
  return { guideId, tabId, stepCount: 0, active: true, paused: false, lastUrl: url };
}

function recordStep(session) {
  if (!canCapture(session)) return session;
  return Object.assign({}, session, { stepCount: session.stepCount + 1 });
}

function pauseSession(session) {
  if (!session.active) return session;
  return Object.assign({}, session, { paused: true });
}

function resumeSession(session) {
  if (!session.active) return session;
  return Object.assign({}, session, { paused: false });
}

function navigate(session, url) {
  return Object.assign({}, session, { lastUrl: url });
}

function completeSession(session) {
  return Object.assign({}, session, { active: false });
}

function canCapture(session) {
  return session.active === true && session.paused === false;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { startSession, recordStep, pauseSession, resumeSession, navigate, completeSession, canCapture };
} else {
  globalThis.RecordingSession = { startSession, recordStep, pauseSession, resumeSession, navigate, completeSession, canCapture };
}
