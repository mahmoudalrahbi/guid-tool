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

test('composite: returns screenshotBlob unchanged for "navigation" stepType', async () => {
  const { composite } = await import('./compositor.js');

  const mockBlob = new Blob(['mock-img'], { type: 'image/jpeg' });
  const step = {
    stepType: 'navigation',
    screenshotBlob: mockBlob
  };

  const result = await composite(step);
  assert.equal(result, mockBlob);
});

test('composite: returns screenshotBlob unchanged for "legacy" stepType', async () => {
  const { composite } = await import('./compositor.js');

  const mockBlob = new Blob(['mock-legacy-img'], { type: 'image/jpeg' });
  const step = {
    stepType: 'legacy',
    screenshotBlob: mockBlob
  };

  const result = await composite(step);
  assert.equal(result, mockBlob);
});

test('composite: draws circle using annotation snapshot values for "click" stepType', async () => {
  const { composite } = await import('./compositor.js');

  const mockBlob = new Blob(['mock-click-img'], { type: 'image/jpeg' });
  const annotation = { x: 50, y: 60, dpr: 2, radius: 20, color: '#ff0000', strokeWidth: 4 };
  const step = {
    stepType: 'click',
    screenshotBlob: mockBlob,
    annotation
  };

  const result = await composite(step);
  assert.ok(result instanceof Blob);
  assert.equal(result.type, 'image/jpeg');

  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.ok(arcCall, 'arc method should be called');

  // Coordinates and radius scale by dpr using the ANNOTATION snapshot values, not CONFIG
  assert.equal(arcCall.args[0], 100,  'x coordinate should be x * dpr');
  assert.equal(arcCall.args[1], 120,  'y coordinate should be y * dpr');
  assert.equal(arcCall.args[2], 40,   'radius should be annotation.radius * dpr');

  const lineWidthCall = ctxCalls.find(c => c.method === 'set_lineWidth');
  assert.ok(lineWidthCall, 'lineWidth should be set');
  assert.equal(lineWidthCall.args[0], 8, 'strokeWidth should be annotation.strokeWidth * dpr');

  const strokeStyleCall = ctxCalls.find(c => c.method === 'set_strokeStyle');
  assert.ok(strokeStyleCall, 'strokeStyle should be set');
  assert.equal(strokeStyleCall.args[0], '#ff0000', 'color should match annotation snapshot, not CONFIG');
});

test('composite: returns screenshotBlob for unknown stepType with blob', async () => {
  const { composite } = await import('./compositor.js');

  const mockBlob = new Blob(['mock-unknown'], { type: 'image/jpeg' });
  const step = { stepType: 'unknown', screenshotBlob: mockBlob };

  const result = await composite(step);
  assert.equal(result, mockBlob);
});

test('composite: throws for unknown stepType without blob', async () => {
  const { composite } = await import('./compositor.js');

  const step = { stepType: 'broken' };
  await assert.rejects(() => composite(step), /unsupported stepType/);
});
