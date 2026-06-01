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
