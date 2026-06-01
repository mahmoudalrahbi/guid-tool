const test = require('node:test');
const assert = require('node:assert/strict');

global.CONFIG = require('../config.js');

global.createImageBitmap = async () => ({ width: 100, height: 100 });

let ctxCalls = [];

global.OffscreenCanvas = class {
  constructor(w, h) { this.width = w; this.height = h; }
  getContext() {
    return {
      drawImage: (...args) => ctxCalls.push({ method: 'drawImage', args }),
      beginPath: () => ctxCalls.push({ method: 'beginPath', args: [] }),
      arc: (...args) => ctxCalls.push({ method: 'arc', args }),
      stroke: () => ctxCalls.push({ method: 'stroke', args: [] }),
      set strokeStyle(val) { ctxCalls.push({ method: 'set_strokeStyle', args: [val] }); },
      set lineWidth(val) { ctxCalls.push({ method: 'set_lineWidth', args: [val] }); }
    };
  }
  async convertToBlob(opts) {
    return new Blob(['mock-out'], { type: opts.type });
  }
};

test.beforeEach(() => {
  ctxCalls = [];
});

// --- drawCircle ---

test('drawCircle: draws circle at annotation.x * dpr, annotation.y * dpr', async () => {
  const { drawCircle } = await import('./annotation-renderer.js');

  const calls = [];
  const ctx = {
    beginPath: () => calls.push({ method: 'beginPath' }),
    arc: (...args) => calls.push({ method: 'arc', args }),
    stroke: () => calls.push({ method: 'stroke' }),
    set strokeStyle(v) { calls.push({ method: 'set_strokeStyle', args: [v] }); },
    set lineWidth(v) { calls.push({ method: 'set_lineWidth', args: [v] }); },
  };

  drawCircle(ctx, { x: 50, y: 60, dpr: 2, radius: 20, color: '#ff0000', strokeWidth: 3 });

  const arcCall = calls.find(c => c.method === 'arc');
  assert.ok(arcCall, 'arc should be called');
  assert.equal(arcCall.args[0], 100, 'cx = x * dpr');
  assert.equal(arcCall.args[1], 120, 'cy = y * dpr');
  assert.equal(arcCall.args[2], 40,  'r = radius * dpr');
});

test('drawCircle: sets strokeStyle to annotation.color and lineWidth to strokeWidth * dpr', async () => {
  const { drawCircle } = await import('./annotation-renderer.js');

  const calls = [];
  const ctx = {
    beginPath: () => {},
    arc: () => {},
    stroke: () => {},
    set strokeStyle(v) { calls.push({ method: 'set_strokeStyle', args: [v] }); },
    set lineWidth(v) { calls.push({ method: 'set_lineWidth', args: [v] }); },
  };

  drawCircle(ctx, { x: 10, y: 10, dpr: 2, radius: 20, color: '#00ff00', strokeWidth: 3 });

  const strokeStyleCall = calls.find(c => c.method === 'set_strokeStyle');
  assert.ok(strokeStyleCall, 'strokeStyle should be set');
  assert.equal(strokeStyleCall.args[0], '#00ff00');

  const lineWidthCall = calls.find(c => c.method === 'set_lineWidth');
  assert.ok(lineWidthCall, 'lineWidth should be set');
  assert.equal(lineWidthCall.args[0], 6, 'lineWidth = strokeWidth * dpr = 3 * 2');
});

// --- composite ---

test('composite: returns screenshotBlob unchanged for navigation step', async () => {
  const { composite } = await import('./annotation-renderer.js');
  const blob = new Blob(['img'], { type: 'image/jpeg' });
  const result = await composite({ stepType: 'navigation', screenshotBlob: blob });
  assert.equal(result, blob);
});

test('composite: returns screenshotBlob unchanged for legacy step', async () => {
  const { composite } = await import('./annotation-renderer.js');
  const blob = new Blob(['img'], { type: 'image/jpeg' });
  const result = await composite({ stepType: 'legacy', screenshotBlob: blob });
  assert.equal(result, blob);
});

test('composite: returns JPEG Blob with annotation circle for click step', async () => {
  const { composite } = await import('./annotation-renderer.js');
  const blob = new Blob(['img'], { type: 'image/jpeg' });
  const annotation = { x: 50, y: 60, dpr: 2, radius: 20, color: '#ff0000', strokeWidth: 4 };
  const result = await composite({ stepType: 'click', screenshotBlob: blob, annotation });

  assert.ok(result instanceof Blob);
  assert.equal(result.type, 'image/jpeg');

  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.ok(arcCall, 'arc must be called');
  assert.equal(arcCall.args[0], 100, 'cx = x * dpr');
  assert.equal(arcCall.args[1], 120, 'cy = y * dpr');
  assert.equal(arcCall.args[2], 40,  'r = radius * dpr');
});

test('composite: DPR scaling — dpr=1 places circle at coordinates as-is', async () => {
  const { composite } = await import('./annotation-renderer.js');
  const blob = new Blob(['img'], { type: 'image/jpeg' });
  const annotation = { x: 75, y: 80, dpr: 1, radius: 28, color: '#f59e0b', strokeWidth: 3 };
  await composite({ stepType: 'click', screenshotBlob: blob, annotation });

  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.ok(arcCall);
  assert.equal(arcCall.args[0], 75, 'cx = x * 1');
  assert.equal(arcCall.args[1], 80, 'cy = y * 1');
  assert.equal(arcCall.args[2], 28, 'r = radius * 1');
});

test('composite: returns screenshotBlob for click step when annotation is null', async () => {
  const { composite } = await import('./annotation-renderer.js');
  const blob = new Blob(['img'], { type: 'image/jpeg' });
  const result = await composite({ stepType: 'click', screenshotBlob: blob, annotation: null });
  assert.equal(result, blob);
});
