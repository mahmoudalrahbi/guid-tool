export async function composite(step) {
  if (step.stepType === 'navigation' || step.stepType === 'legacy') {
    return step.screenshotBlob;
  }

  if (step.stepType === 'click') {
    const { x, y, dpr, radius, color, strokeWidth } = step.annotation;
    const bitmap = await createImageBitmap(step.screenshotBlob);

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);

    const cx = x * dpr;
    const cy = y * dpr;
    const r = radius * dpr;

    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth * dpr;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.stroke();

    const outBlob = await canvas.convertToBlob({ type: `image/${CONFIG.CAPTURE_FORMAT}`, quality: CONFIG.ANNOTATED_QUALITY });
    return outBlob;
  }

  // Unknown or missing stepType — return blob unchanged to avoid crashing downstream
  if (step.screenshotBlob) {
    return step.screenshotBlob;
  }

  throw new Error(`composite: unsupported stepType "${step.stepType}" and no screenshotBlob`);
}
