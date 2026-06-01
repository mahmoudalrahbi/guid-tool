/**
 * AnnotationRenderer — all annotation circle-drawing logic lives here.
 * compositor.js is a thin adapter over this module.
 *
 * Config values are the caller's responsibility; this module reads only
 * the annotation object it receives and does not import CONFIG directly.
 */

/**
 * Draws a stroked circle onto an existing 2D canvas context.
 * Coordinates and radius are DPR-scaled before drawing.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x, y, dpr, radius, color, strokeWidth }} annotation
 */
export function drawCircle(ctx, annotation) {
  const { x, y, dpr, radius, color, strokeWidth } = annotation;
  const cx = x * dpr;
  const cy = y * dpr;
  const r = radius * dpr;

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.stroke();
}

/**
 * Composites a Step's annotation onto its screenshot blob.
 * Click steps: draws the annotation circle; returns a JPEG Blob.
 * Navigation / legacy steps: returns screenshotBlob unchanged.
 *
 * @param {object} step
 * @returns {Promise<Blob>}
 */
export async function composite(step) {
  if (step.stepType === 'navigation' || step.stepType === 'legacy') {
    return step.screenshotBlob;
  }

  if (step.stepType === 'click') {
    if (!step.annotation) return step.screenshotBlob;

    const bitmap = await createImageBitmap(step.screenshotBlob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);

    drawCircle(ctx, step.annotation);

    return canvas.convertToBlob({ type: `image/${CONFIG.CAPTURE_FORMAT}`, quality: CONFIG.ANNOTATED_QUALITY });
  }

  if (step.screenshotBlob) return step.screenshotBlob;
  throw new Error(`composite: unsupported stepType "${step.stepType}" and no screenshotBlob`);
}

/**
 * Composites an annotation circle over a screenshot data URL using a DOM <canvas>.
 * For use in the Side Panel context where OffscreenCanvas is unavailable.
 * Returns a JPEG data URL with the circle drawn at annotation coordinates.
 *
 * @param {string} dataUrl - Raw screenshot as a data URL.
 * @param {{ x, y, dpr, radius?, color?, strokeWidth? }} annotation
 * @returns {Promise<string>} JPEG data URL
 */
export function compositeThumbnail(dataUrl, annotation) {
  const a = {
    x: annotation.x,
    y: annotation.y,
    dpr: annotation.dpr || 1,
    radius: annotation.radius || CONFIG.ANNOTATION.RADIUS_PX,
    color: annotation.color || CONFIG.ANNOTATION.COLOR,
    strokeWidth: annotation.strokeWidth || CONFIG.ANNOTATION.STROKE_WIDTH_PX,
  };
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      drawCircle(ctx, a);
      resolve(canvas.toDataURL(`image/${CONFIG.CAPTURE_FORMAT}`, CONFIG.ANNOTATED_QUALITY));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
