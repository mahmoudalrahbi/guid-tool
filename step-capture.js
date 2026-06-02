// step-capture.js - Deep module: owns the Recording Session step-capture pipeline.
// Accepts screenshot, describer, db, and broadcast as injected adapters so the
// full capture path is exercisable in Node tests without a real Chrome context.

function createStepCapture(deps) {
  var screenshot = deps.screenshot;
  var describer = deps.describer;
  var db = deps.db;
  var broadcast = deps.broadcast;
  var cfg = (deps.config || (typeof CONFIG !== 'undefined' ? CONFIG : {}));

  return {
    async captureClick(metadata, session) {
      var dataUrl = await screenshot(session.tabId);
      var blob = dataUrlToBlob(dataUrl);
      var description = await describer(metadata);
      var stepCount = session.stepCount + 1;
      var now = Date.now();
      var step = createStoredStep({
        id: 'step-' + session.guideId + '-' + stepCount,
        guideId: session.guideId,
        order: stepCount,
        stepType: 'click',
        description: description,
        screenshotBlob: blob,
        annotation: {
          x: metadata.x,
          y: metadata.y,
          dpr: metadata.dpr,
          radius: cfg.ANNOTATION.RADIUS_PX,
          color: cfg.ANNOTATION.COLOR,
          strokeWidth: cfg.ANNOTATION.STROKE_WIDTH_PX,
        },
        url: session.lastUrl,
        createdAt: now,
        updatedAt: now,
      });
      await db.saveStep(step);
      broadcast({ type: MSG_STEP_ADDED, step: toStepMessage(step, dataUrl) });
      return { step, dataUrl };
    },

    async captureNavigation(url, session) {
      var dataUrl = await screenshot(session.tabId);
      var blob = dataUrlToBlob(dataUrl);
      var stepCount = session.stepCount + 1;
      var now = Date.now();
      var step = createStoredStep({
        id: 'step-' + session.guideId + '-' + stepCount,
        guideId: session.guideId,
        order: stepCount,
        stepType: 'navigation',
        description: 'Navigated to ' + url,
        screenshotBlob: blob,
        url: url,
        createdAt: now,
        updatedAt: now,
      });
      await db.saveStep(step);
      broadcast({ type: MSG_STEP_ADDED, step: toStepMessage(step, dataUrl) });
      return { step, dataUrl };
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createStepCapture };
} else {
  globalThis.createStepCapture = createStepCapture;
}
