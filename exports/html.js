export async function exportToHtml(guide, steps) {
  const stepsWithDataUrls = await Promise.all(
    steps.map(async (step) => {
      const dataUrl = await blobToDataUrl(step.screenshotBlob);
      return { ...step, dataUrl };
    })
  );

  const stepsHtml = stepsWithDataUrls
    .map(
      (step) => `
    <div class="step">
      <div class="step-num">Step ${step.order}</div>
      <img src="${step.dataUrl}" alt="Step ${step.order}" />
      <p>${escapeHtml(step.description)}</p>
    </div>`
    )
    .join("\n");

  const guideDescHtml = guide.description ? `<p class="guide-desc">${escapeHtml(guide.description)}</p>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(guide.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #111; }
    h1 { font-size: 26px; margin-bottom: 8px; }
    .guide-desc { font-size: 16px; color: #4b5563; margin-bottom: 32px; }
    .step { display: flex; gap: 16px; align-items: flex-start; padding: 24px 0; border-bottom: 1px solid #e5e7eb; }
    .step-num { font-size: 12px; font-weight: 600; color: #fff; background: #3b82f6; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 12px; flex-shrink: 0; }
    .step img { width: 260px; border-radius: 6px; flex-shrink: 0; border: 1px solid #e5e7eb; }
    .step p { margin: 0; color: #374151; font-size: 15px; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>${escapeHtml(guide.title)}</h1>
  ${guideDescHtml}
  ${stepsHtml}
</body>
</html>`;

  return new Blob([html], { type: "text/html" });
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
