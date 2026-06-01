// messages.js - Shared message contracts for LocalGuide

var MSG_RECORDING_STARTED = 'RECORDING_STARTED';
var MSG_STEP_ADDED = 'STEP_ADDED';
var MSG_RECORDING_PAUSED = 'RECORDING_PAUSED';
var MSG_RECORDING_RESUMED = 'RECORDING_RESUMED';
var MSG_RECORDING_STOPPED = 'RECORDING_STOPPED';
var MSG_CLICK_CAPTURED = 'CLICK_CAPTURED';
var MSG_START_RECORDING = 'START_RECORDING';
var MSG_PAUSE_RECORDING = 'PAUSE_RECORDING';
var MSG_RESUME_RECORDING = 'RESUME_RECORDING';
var MSG_COMPLETE_CAPTURE = 'COMPLETE_CAPTURE';

var VALID_STEP_TYPES = ['click', 'navigation', 'legacy'];

/**
 * Validates and returns a StoredStep — the canonical shape for a Step in IndexedDB.
 * Throws on missing required fields or invalid stepType.
 * Click steps require annotation; navigation/legacy steps must not supply one.
 */
function createStoredStep(fields) {
  var required = ['id', 'guideId', 'order', 'stepType', 'description', 'screenshotBlob', 'url', 'createdAt', 'updatedAt'];
  for (var i = 0; i < required.length; i++) {
    var key = required[i];
    if (fields[key] == null) {
      throw new Error('createStoredStep: missing required field "' + key + '"');
    }
  }

  if (VALID_STEP_TYPES.indexOf(fields.stepType) === -1) {
    throw new Error('createStoredStep: invalid stepType "' + fields.stepType + '" — must be one of ' + VALID_STEP_TYPES.join(', '));
  }

  if (fields.stepType === 'click' && !fields.annotation) {
    throw new Error('createStoredStep: annotation is required when stepType is "click"');
  }

  var step = {
    id: fields.id,
    guideId: fields.guideId,
    order: fields.order,
    stepType: fields.stepType,
    description: fields.description,
    screenshotBlob: fields.screenshotBlob,
    url: fields.url,
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  };

  if (fields.annotation) {
    step.annotation = fields.annotation;
  }

  return step;
}

/**
 * Constructs a StepMessage for MSG_STEP_ADDED IPC.
 * Replaces screenshotBlob with a data URL string; all other fields are preserved.
 * Throws when step.id or dataUrl is missing.
 */
function toStepMessage(step, dataUrl) {
  if (!step || !step.id) {
    throw new Error('toStepMessage: step must have an id');
  }
  if (!dataUrl) {
    throw new Error('toStepMessage: dataUrl is required');
  }

  var msg = {
    id: step.id,
    guideId: step.guideId,
    order: step.order,
    stepType: step.stepType,
    description: step.description,
    screenshotDataUrl: dataUrl,
    url: step.url,
    createdAt: step.createdAt,
    updatedAt: step.updatedAt,
  };

  if (step.annotation) {
    msg.annotation = step.annotation;
  }

  return msg;
}

/**
 * Wraps a validated StoredStep for use inside export format modules.
 * The returned ExportStep has a `composite()` method that calls `compositor(storedStep)`.
 * Throws if storedStep fails StoredStep validation.
 */
function toExportStep(storedStep, compositor) {
  var validated = createStoredStep(storedStep);
  validated.composite = function() {
    return compositor(validated);
  };
  return validated;
}

// CJS export for node:test runner. Ignored in browser context.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MSG_RECORDING_STARTED,
    MSG_STEP_ADDED,
    MSG_RECORDING_PAUSED,
    MSG_RECORDING_RESUMED,
    MSG_RECORDING_STOPPED,
    MSG_CLICK_CAPTURED,
    MSG_START_RECORDING,
    MSG_PAUSE_RECORDING,
    MSG_RESUME_RECORDING,
    MSG_COMPLETE_CAPTURE,
    createStoredStep,
    toStepMessage,
    toExportStep,
  };
}
