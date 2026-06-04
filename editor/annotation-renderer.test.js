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

// DOM canvas + Image mocks for compositeThumbnail (uses <canvas> not OffscreenCanvas)
global.Image = class {
  constructor() {
    this.naturalWidth = 200;
    this.naturalHeight = 100;
    Object.defineProperty(this, 'src', {
      set: (_val) => { if (typeof this.onload === 'function') this.onload(); },
      get: () => this._src,
    });
  }
};

global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: (...args) => ctxCalls.push({ method: 'drawImage', args }),
          beginPath: () => ctxCalls.push({ method: 'beginPath', args: [] }),
          arc: (...args) => ctxCalls.push({ method: 'arc', args }),
          stroke: () => ctxCalls.push({ method: 'stroke', args: [] }),
          set strokeStyle(val) { ctxCalls.push({ method: 'set_strokeStyle', args: [val] }); },
          set lineWidth(val) { ctxCalls.push({ method: 'set_lineWidth', args: [val] }); },
        }),
        toDataURL: (type, quality) => `data:image/jpeg;base64,mock-${quality}`,
      };
    }
    return {};
  },
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

test('composite: legacy annotation missing dpr defaults dpr to 1 — coordinates placed without scaling', async () => {
  const { composite } = await import('./annotation-renderer.js');
  const blob = new Blob(['img'], { type: 'image/jpeg' });
  const annotation = { x: 75, y: 80, radius: 28, color: '#f59e0b', strokeWidth: 3 };
  await composite({ stepType: 'click', screenshotBlob: blob, annotation });

  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.ok(arcCall, 'arc should be called');
  assert.equal(arcCall.args[0], 75, 'cx = x * 1 when dpr is absent');
  assert.equal(arcCall.args[1], 80, 'cy = y * 1 when dpr is absent');
  assert.equal(arcCall.args[2], 28, 'r = radius * 1 when dpr is absent');
});

test('composite: legacy annotation missing dpr resolves to a Blob without NaN arc coordinates', async () => {
  const { composite } = await import('./annotation-renderer.js');
  const blob = new Blob(['img'], { type: 'image/jpeg' });
  const annotation = { x: 50, y: 60, radius: 20, color: '#ff0000', strokeWidth: 3 };
  const result = await composite({ stepType: 'click', screenshotBlob: blob, annotation });

  assert.ok(result instanceof Blob, 'should resolve to a Blob');
  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.ok(arcCall, 'arc should be called');
  assert.ok(!isNaN(arcCall.args[0]), 'cx must not be NaN');
  assert.ok(!isNaN(arcCall.args[1]), 'cy must not be NaN');
  assert.ok(!isNaN(arcCall.args[2]), 'r must not be NaN');
});

// --- compositeThumbnail ---

test('compositeThumbnail: returns a JPEG data URL', async () => {
  const { compositeThumbnail } = await import('./annotation-renderer.js');
  const result = await compositeThumbnail('data:image/jpeg;base64,mock', {
    x: 10, y: 20, dpr: 1, radius: CONFIG.ANNOTATION.RADIUS_PX,
    color: CONFIG.ANNOTATION.COLOR, strokeWidth: CONFIG.ANNOTATION.STROKE_WIDTH_PX,
  });
  assert.ok(typeof result === 'string', 'result should be a string');
  assert.ok(result.startsWith('data:image/jpeg'), 'result should be a JPEG data URL');
});

test('compositeThumbnail: draws arc at DPR-scaled coordinates (dpr=1)', async () => {
  const { compositeThumbnail } = await import('./annotation-renderer.js');
  await compositeThumbnail('data:image/jpeg;base64,mock', {
    x: 50, y: 60, dpr: 1, radius: CONFIG.ANNOTATION.RADIUS_PX,
    color: CONFIG.ANNOTATION.COLOR, strokeWidth: CONFIG.ANNOTATION.STROKE_WIDTH_PX,
  });
  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.ok(arcCall, 'arc() should be called');
  assert.equal(arcCall.args[0], 50, 'cx = x * dpr = 50 * 1');
  assert.equal(arcCall.args[1], 60, 'cy = y * dpr = 60 * 1');
  assert.equal(arcCall.args[2], CONFIG.ANNOTATION.RADIUS_PX, 'radius = RADIUS_PX * 1');
});

test('compositeThumbnail: scales coordinates and radius by DPR (dpr=2)', async () => {
  const { compositeThumbnail } = await import('./annotation-renderer.js');
  await compositeThumbnail('data:image/jpeg;base64,mock', {
    x: 50, y: 60, dpr: 2, radius: CONFIG.ANNOTATION.RADIUS_PX,
    color: CONFIG.ANNOTATION.COLOR, strokeWidth: CONFIG.ANNOTATION.STROKE_WIDTH_PX,
  });
  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.equal(arcCall.args[0], 100, 'cx = 50 * 2');
  assert.equal(arcCall.args[1], 120, 'cy = 60 * 2');
  assert.equal(arcCall.args[2], CONFIG.ANNOTATION.RADIUS_PX * 2, 'radius scaled by dpr');
  const lineWidthCall = ctxCalls.find(c => c.method === 'set_lineWidth');
  assert.equal(lineWidthCall.args[0], CONFIG.ANNOTATION.STROKE_WIDTH_PX * 2, 'strokeWidth scaled by dpr');
});

test('compositeThumbnail: uses annotation color', async () => {
  const { compositeThumbnail } = await import('./annotation-renderer.js');
  await compositeThumbnail('data:image/jpeg;base64,mock', {
    x: 10, y: 10, dpr: 1, color: '#ff0000',
    radius: CONFIG.ANNOTATION.RADIUS_PX, strokeWidth: CONFIG.ANNOTATION.STROKE_WIDTH_PX,
  });
  const strokeStyleCall = ctxCalls.find(c => c.method === 'set_strokeStyle');
  assert.equal(strokeStyleCall.args[0], '#ff0000');
});

test('compositeThumbnail: falls back to CONFIG defaults for missing radius/color/strokeWidth', async () => {
  const { compositeThumbnail } = await import('./annotation-renderer.js');
  await compositeThumbnail('data:image/jpeg;base64,mock', { x: 10, y: 10, dpr: 1 });
  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.equal(arcCall.args[2], CONFIG.ANNOTATION.RADIUS_PX, 'radius falls back to CONFIG');
  const strokeStyleCall = ctxCalls.find(c => c.method === 'set_strokeStyle');
  assert.equal(strokeStyleCall.args[0], CONFIG.ANNOTATION.COLOR, 'color falls back to CONFIG');
});

test('compositeThumbnail: rejects when image fails to load', async () => {
  const { compositeThumbnail } = await import('./annotation-renderer.js');
  const OrigImage = global.Image;
  global.Image = class {
    constructor() {
      Object.defineProperty(this, 'src', {
        set: (_val) => { if (typeof this.onerror === 'function') this.onerror(new Error('load failed')); },
      });
    }
  };
  try {
    await assert.rejects(
      compositeThumbnail('data:bad', { x: 0, y: 0, dpr: 1 }),
      'should reject when image fails to load'
    );
  } finally {
    global.Image = OrigImage;
  }
});
