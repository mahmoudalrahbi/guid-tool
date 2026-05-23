const assert = require('assert');
const test = require('node:test');
const CONFIG = require('./config.js');

test('CONFIG object contains expected structure and values', () => {
  assert.equal(CONFIG.DB.NAME, 'localguide');
  assert.equal(CONFIG.DB.VERSION, 1);
  assert.equal(CONFIG.STORE_GUIDES, 'guides');
  assert.equal(CONFIG.STORE_STEPS, 'steps');

  assert.equal(CONFIG.CAPTURE_FORMAT, 'jpeg');
  assert.equal(CONFIG.CAPTURE_QUALITY, 80);
  assert.equal(CONFIG.ANNOTATED_QUALITY, 0.82);
  
  assert.equal(CONFIG.ANNOTATION.RADIUS_PX, 28);
  assert.equal(CONFIG.ANNOTATION.STROKE_WIDTH_PX, 3);
  assert.equal(CONFIG.ANNOTATION.COLOR, '#f59e0b');

  assert.equal(CONFIG.UI_MAX_DESC_LEN, 120);
  assert.equal(CONFIG.EDITOR.AUTOSAVE_DEBOUNCE_MS, 700);
  assert.equal(CONFIG.UI_NAV_DELAY_MS, 500);
  assert.equal(CONFIG.EDITOR.UNDO_TIMEOUT_MS, 3800);
  assert.equal(CONFIG.UI_TOAST_ANIMATION_MS, 200);
  assert.equal(CONFIG.UI_TOAST_FADEOUT_MS, 220);
  assert.equal(CONFIG.UI_DRAG_THRESHOLD, 80);
});
