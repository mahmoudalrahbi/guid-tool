const test = require('node:test');
const assert = require('node:assert/strict');
const messages = require('./messages.js');

test('messages: exports required constants', () => {
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

  const expectedKeys = [
    'MSG_RECORDING_STARTED',
    'MSG_STEP_ADDED',
    'MSG_RECORDING_PAUSED',
    'MSG_RECORDING_RESUMED',
    'MSG_RECORDING_STOPPED',
    'MSG_CLICK_CAPTURED',
    'MSG_START_RECORDING',
    'MSG_PAUSE_RECORDING',
    'MSG_RESUME_RECORDING',
    'MSG_COMPLETE_CAPTURE'
  ];
  assert.deepEqual(Object.keys(messages).sort(), expectedKeys.sort());
});
