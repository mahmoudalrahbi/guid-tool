// annotator.js - Handles drawing highlights onto captured screenshots

async function annotate(dataUrl, annotation, opts = {}) {
  const radius = annotation.radius || CONFIG.ANNOTATION.RADIUS_PX;
  const strokeWidth = opts.strokeWidth || CONFIG.ANNOTATION.STROKE_WIDTH_PX;
  const color = annotation.color || CONFIG.ANNOTATION.COLOR;
  const quality = opts.quality || CONFIG.ANNOTATED_QUALITY;

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);

  // Scale click coords to device pixel ratio (screenshots are at devicePixelRatio)
  const cx = annotation.x * annotation.dpr;
  const cy = annotation.y * annotation.dpr;
  const r = radius * annotation.dpr;

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth * annotation.dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.stroke();

  const outBlob = await canvas.convertToBlob({ type: `image/${CONFIG.CAPTURE_FORMAT}`, quality: quality });
  // blobToDataUrl is expected to be available globally (from utils.js)
  if (typeof blobToDataUrl !== 'function') {
    throw new Error("blobToDataUrl is not defined. Ensure utils.js is loaded before annotator.js.");
  }
  return blobToDataUrl(outBlob);
}

// CJS export for node:test runner. Ignored in browser context.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    annotate,
  };
}
