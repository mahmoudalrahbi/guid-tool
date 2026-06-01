const test = require('node:test');
const assert = require('node:assert/strict');
const messages = require('./messages.js');
const { createStoredStep, toStepMessage } = messages;

test('messages: exports required constants and factories', () => {
  assert.equal(messages.MSG_RECORDING_STARTED, 'RECORDING_STARTED');
  assert.equal(messages.MSG_STEP_ADDED, 'STEP_ADDED');
  assert.equal(messages.MSG_RECORDING_PAUSED, 'RECORDING_PAUSED');
  assert.equal(messages.MSG_RECORDING_RESUMED, 'RECORDING_RESUMED');
  assert.equal(messages.MSG_RECORDING_STOPPED, 'RECORDING_STOPPED');
  assert.equal(messages.MSG_CLICK_CAPTURED, 'CLICK_CAPTURED');
  assert.equal(messages.MSG_START_RECORDING, 'START_RECORDING');
  assert.equal(messages.MSG_PAUSE_RECORDING, 'PAUSE_RECORDING');
  assert.equal(messages.MSG_RESUME_RECORDING, 'RESUME_RECORDING');
  assert.equal(messages.MSG_COMPLETE_CAPTURE, 'COMPLETE_CAPTURE');
  assert.equal(typeof messages.createStoredStep, 'function');
  assert.equal(typeof messages.toStepMessage, 'function');
});

// --- createStoredStep ---

function validClickFields() {
  return {
    id: 'step-g1-1',
    guideId: 'g1',
    order: 1,
    stepType: 'click',
    description: 'Clicked Save',
    screenshotBlob: Buffer.from('img'),
    url: 'https://example.com',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    annotation: { x: 100, y: 200, dpr: 2, radius: 28, color: '#f59e0b', strokeWidth: 3 },
  };
}

function validNavFields() {
  return {
    id: 'step-g1-2',
    guideId: 'g1',
    order: 2,
    stepType: 'navigation',
    description: 'Navigated to /home',
    screenshotBlob: Buffer.from('img'),
    url: 'https://example.com/home',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

test('createStoredStep: throws when stepType click has no annotation', () => {
  const fields = validClickFields();
  delete fields.annotation;
  assert.throws(() => createStoredStep(fields), /annotation/i);
});

test('createStoredStep: accepts stepType click with annotation', () => {
  const step = createStoredStep(validClickFields());
  assert.equal(step.stepType, 'click');
  assert.ok(step.annotation);
});

test('createStoredStep: accepts stepType navigation without annotation', () => {
  const step = createStoredStep(validNavFields());
  assert.equal(step.stepType, 'navigation');
  assert.equal(step.annotation, undefined);
});

test('createStoredStep: accepts stepType legacy without annotation', () => {
  const fields = { ...validNavFields(), stepType: 'legacy' };
  const step = createStoredStep(fields);
  assert.equal(step.stepType, 'legacy');
});

test('createStoredStep: throws on invalid stepType', () => {
  const fields = { ...validNavFields(), stepType: 'unknown' };
  assert.throws(() => createStoredStep(fields), /stepType/i);
});

test('createStoredStep: throws when required field is missing', () => {
  const fields = validNavFields();
  delete fields.id;
  assert.throws(() => createStoredStep(fields), /id/i);
});

// --- toStepMessage ---

test('toStepMessage: throws when dataUrl is missing', () => {
  const step = createStoredStep(validClickFields());
  assert.throws(() => toStepMessage(step, null), /dataUrl/i);
  assert.throws(() => toStepMessage(step, ''), /dataUrl/i);
});

test('toStepMessage: throws when step has no id', () => {
  const step = createStoredStep(validClickFields());
  delete step.id;
  assert.throws(() => toStepMessage(step, 'data:image/jpeg;base64,abc'), /id/i);
});

test('toStepMessage: output has no screenshotBlob and has screenshotDataUrl', () => {
  const step = createStoredStep(validClickFields());
  const msg = toStepMessage(step, 'data:image/jpeg;base64,abc');
  assert.equal('screenshotBlob' in msg, false);
  assert.equal(typeof msg.screenshotDataUrl, 'string');
  assert.equal(msg.screenshotDataUrl, 'data:image/jpeg;base64,abc');
});

test('toStepMessage: output preserves all other StoredStep fields', () => {
  const step = createStoredStep(validClickFields());
  const msg = toStepMessage(step, 'data:image/jpeg;base64,abc');
  assert.equal(msg.id, step.id);
  assert.equal(msg.guideId, step.guideId);
  assert.equal(msg.order, step.order);
  assert.equal(msg.stepType, step.stepType);
  assert.equal(msg.description, step.description);
  assert.deepEqual(msg.annotation, step.annotation);
});
