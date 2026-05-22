const HIGHLIGHT_COLOR = '#F59E0B';
const HIGHLIGHT_RADIUS_PX = 36;
const HIGHLIGHT_LINE_WIDTH = 6;
const JPEG_QUALITY = 0.85;

async function annotateScreenshot(sourceBlob, { x, y, viewportWidth, viewportHeight } = {}) {
  const bitmap = await createImageBitmap(sourceBlob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);

  let cx = x;
  let cy = y;
  if (viewportWidth && viewportHeight) {
    cx = (x / viewportWidth) * bitmap.width;
    cy = (y / viewportHeight) * bitmap.height;
  }

  ctx.lineWidth = HIGHLIGHT_LINE_WIDTH;
  ctx.strokeStyle = HIGHLIGHT_COLOR;
  ctx.beginPath();
  ctx.arc(cx, cy, HIGHLIGHT_RADIUS_PX, 0, Math.PI * 2);
  ctx.stroke();

  if (bitmap.close) bitmap.close();

  return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
}

const __api = {
  annotateScreenshot,
  HIGHLIGHT_COLOR,
  HIGHLIGHT_RADIUS_PX,
  HIGHLIGHT_LINE_WIDTH,
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = __api;
}
if (typeof self !== 'undefined') {
  self.LocalGuide = Object.assign(self.LocalGuide || {}, __api);
}
