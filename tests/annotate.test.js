const { annotateScreenshot, HIGHLIGHT_COLOR, HIGHLIGHT_RADIUS_PX } = require('../src/annotate.js');

function makeCanvasMock({ width, height }) {
  const calls = { arc: [], drawImage: [], stroke: 0, fill: 0, convertToBlob: [] };
  const ctx = {
    drawImage: (...args) => { calls.drawImage.push(args); },
    beginPath: () => {},
    arc: (...args) => { calls.arc.push(args); },
    stroke: () => { calls.stroke += 1; },
    fill: () => { calls.fill += 1; },
    set lineWidth(v) { calls.lineWidth = v; },
    set strokeStyle(v) { calls.strokeStyle = v; },
    set fillStyle(v) { calls.fillStyle = v; },
  };
  return {
    canvas: {
      width,
      height,
      getContext: () => ctx,
      convertToBlob: (options) => {
        calls.convertToBlob.push(options);
        return Promise.resolve(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' }));
      },
    },
    calls,
  };
}

describe('annotateScreenshot', () => {
  let capturedCanvas;

  beforeEach(() => {
    capturedCanvas = null;
    globalThis.OffscreenCanvas = class OffscreenCanvasMock {
      constructor(w, h) {
        const mock = makeCanvasMock({ width: w, height: h });
        capturedCanvas = mock;
        this.width = w;
        this.height = h;
        this.getContext = mock.canvas.getContext;
        this.convertToBlob = mock.canvas.convertToBlob;
      }
    };
    globalThis.createImageBitmap = (blob) => Promise.resolve({ width: 1920, height: 1080, close: () => {} });
  });

  test('creates a canvas matching the source image dimensions', async () => {
    const source = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    await annotateScreenshot(source, { x: 100, y: 100, viewportWidth: 960, viewportHeight: 540 });
    expect(capturedCanvas.canvas.width).toBe(1920);
    expect(capturedCanvas.canvas.height).toBe(1080);
  });

  test('draws the source image at the origin filling the canvas', async () => {
    const source = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    await annotateScreenshot(source, { x: 100, y: 100, viewportWidth: 960, viewportHeight: 540 });
    expect(capturedCanvas.calls.drawImage).toHaveLength(1);
    const args = capturedCanvas.calls.drawImage[0];
    expect(args[1]).toBe(0);
    expect(args[2]).toBe(0);
  });

  test('draws the highlight circle at click coords scaled to image dimensions', async () => {
    const source = new Blob([new Uint8Array([1])], { type: 'image/png' });
    await annotateScreenshot(source, { x: 480, y: 270, viewportWidth: 960, viewportHeight: 540 });
    // 480/960 * 1920 = 960; 270/540 * 1080 = 540
    expect(capturedCanvas.calls.arc).toHaveLength(1);
    const [cx, cy, r] = capturedCanvas.calls.arc[0];
    expect(cx).toBe(960);
    expect(cy).toBe(540);
    expect(r).toBe(HIGHLIGHT_RADIUS_PX);
  });

  test('uses the amber highlight color for the circle stroke', async () => {
    const source = new Blob([new Uint8Array([1])], { type: 'image/png' });
    await annotateScreenshot(source, { x: 10, y: 10, viewportWidth: 100, viewportHeight: 100 });
    expect(capturedCanvas.calls.strokeStyle).toBe(HIGHLIGHT_COLOR);
    expect(capturedCanvas.calls.stroke).toBeGreaterThanOrEqual(1);
  });

  test('returns a JPEG blob', async () => {
    const source = new Blob([new Uint8Array([1])], { type: 'image/png' });
    const result = await annotateScreenshot(source, { x: 0, y: 0, viewportWidth: 100, viewportHeight: 100 });
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/jpeg');
    expect(capturedCanvas.calls.convertToBlob[0]).toEqual({ type: 'image/jpeg', quality: expect.any(Number) });
  });

  test('falls back to drawing at literal click coords when viewport dims are missing', async () => {
    const source = new Blob([new Uint8Array([1])], { type: 'image/png' });
    await annotateScreenshot(source, { x: 50, y: 60 });
    const [cx, cy] = capturedCanvas.calls.arc[0];
    expect(cx).toBe(50);
    expect(cy).toBe(60);
  });
});
