export async function composite(step) {
  if (step.stepType === 'navigation' || step.stepType === 'legacy') {
    return step.screenshotBlob;
  }

  if (step.stepType === 'click') {
    const { x, y, dpr } = step.annotation;
    const bitmap = await createImageBitmap(step.screenshotBlob);
    
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);

    const radius = CONFIG.ANNOTATION.RADIUS_PX;
    const strokeWidth = CONFIG.ANNOTATION.STROKE_WIDTH_PX;
    const color = CONFIG.ANNOTATION.COLOR;
    const quality = CONFIG.ANNOTATED_QUALITY;

    const cx = x * dpr;
    const cy = y * dpr;
    const r = radius * dpr;

    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth * dpr;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.stroke();

    const outBlob = await canvas.convertToBlob({ type: `image/${CONFIG.CAPTURE_FORMAT}`, quality: quality });
    return outBlob;
  }
}
