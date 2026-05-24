const test = require('node:test');
const assert = require('node:assert/strict');
const annotator = require('./annotator.js');

global.CONFIG = require('./config.js');
global.blobToDataUrl = async (blob) => `data:${blob.type};base64,mock`;

global.fetch = async () => ({
  blob: async () => new Blob(['mock'], { type: 'image/png' })
});

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

test('annotate: returns a JPEG data URL', async () => {
  const result = await annotator.annotate('data:image/png;base64,mock', { x: 10, y: 10, dpr: 1 });
  assert.ok(result.startsWith('data:image/jpeg;base64'));
});

test('annotate: draws circle at correct coordinates relative to click position', async () => {
  await annotator.annotate('data:image/png;base64,mock', { x: 50, y: 60, dpr: 1 });
  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.ok(arcCall, 'arc method should be called');
  // arc(x, y, radius, startAngle, endAngle)
  assert.equal(arcCall.args[0], 50, 'x coordinate should match');
  assert.equal(arcCall.args[1], 60, 'y coordinate should match');
  assert.equal(arcCall.args[2], CONFIG.ANNOTATION.RADIUS_PX, 'radius should match config');
});

test('annotate: circle radius and coordinates scale correctly with device pixel ratio', async () => {
  await annotator.annotate('data:image/png;base64,mock', { x: 50, y: 60, dpr: 2 });
  const arcCall = ctxCalls.find(c => c.method === 'arc');
  assert.ok(arcCall, 'arc method should be called');
  
  assert.equal(arcCall.args[0], 100, 'x coordinate should be scaled by DPR');
  assert.equal(arcCall.args[1], 120, 'y coordinate should be scaled by DPR');
  assert.equal(arcCall.args[2], CONFIG.ANNOTATION.RADIUS_PX * 2, 'radius should be scaled by DPR');
  
  const lineWidthCall = ctxCalls.find(c => c.method === 'set_lineWidth');
  assert.ok(lineWidthCall, 'lineWidth should be set');
  assert.equal(lineWidthCall.args[0], CONFIG.ANNOTATION.STROKE_WIDTH_PX * 2, 'strokeWidth should be scaled by DPR');
});

test('annotate: handles missing blobToDataUrl dependency gracefully', async () => {
  const originalBlobToDataUrl = global.blobToDataUrl;
  global.blobToDataUrl = undefined;
  
  try {
    await assert.rejects(
      annotator.annotate('data:image/png;base64,mock', { x: 10, y: 10, dpr: 1 }),
      /blobToDataUrl is not defined/
    );
  } finally {
    global.blobToDataUrl = originalBlobToDataUrl;
  }
});
