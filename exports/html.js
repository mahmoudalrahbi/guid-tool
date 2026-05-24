export async function exportToHtml(guide, steps, deps) {
  const stepsWithDataUrls = await Promise.all(
    steps.map(async (step) => {
      const compositedBlob = await deps.composite(step);
      const dataUrl = await deps.blobToDataUrl(compositedBlob);
      return { ...step, dataUrl };
    })
  );

  const stepsHtml = stepsWithDataUrls
    .map(
      (step) => `
    <div class="step">
      <div class="step-num">${step.order}</div>
      <div class="step-body">
        <div class="shot"><img src="${step.dataUrl}" alt="Step ${step.order}" /></div>
        <p>${deps.escapeHtml(step.description)}</p>
      </div>
    </div>`
    )
    .join("\n");

  const guideDescHtml = guide.description ? `<p class="guide-desc">${deps.escapeHtml(guide.description)}</p>` : "";
  const guideTitle = guide.title ? deps.escapeHtml(guide.title) : "Untitled Guide";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${guideTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-0: #0A0A0A;
      --bg-1: #0F0F0F;
      --bg-2: #1A1A1A;
      --line: #2A2A2A;
      --line-soft: #1F1F1F;
      --text-1: #ECECEC;
      --text-2: #9A9A9A;
      --text-3: #5E5E5E;
      --text-4: #3F3F3F;
      --accent: #F59E0B;
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg-0);
      color: var(--text-1);
      max-width: 880px;
      margin: 0 auto;
      padding: 56px 32px 160px;
      -webkit-font-smoothing: antialiased;
    }
    .eyebrow {
      display: flex; align-items: center; gap: 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px;
      color: var(--text-3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 18px;
    }
    .eyebrow .pip { width: 6px; height: 6px; border-radius: 2px; background: var(--accent); }
    .eyebrow .stat { color: var(--text-2); }
    .eyebrow .stat b { color: var(--text-1); font-weight: 500; }
    h1 {
      font-size: 38px;
      font-weight: 700;
      letter-spacing: -0.025em;
      line-height: 1.15;
      margin: 0 0 10px 0;
    }
    .guide-desc {
      font-size: 16px;
      line-height: 1.55;
      color: var(--text-2);
      margin: 0 0 40px 0;
    }
    .steps { display: flex; flex-direction: column; gap: 8px; }
    .step {
      position: relative;
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 14px;
      padding: 18px 18px 18px 8px;
      border-radius: 12px;
      border: 1px solid transparent;
    }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      background: var(--bg-2);
      border: 1px solid var(--line);
      display: grid;
      place-items: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--text-2);
      font-weight: 500;
      flex-shrink: 0;
      margin-top: 6px;
    }
    .step-body { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
    .shot {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      background: #0D0D0D;
      border: 1px solid var(--line);
      aspect-ratio: 16 / 9;
    }
    .shot img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .step p {
      font-size: 15px;
      line-height: 1.55;
      color: var(--text-1);
      margin: 0;
      padding: 10px 12px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid transparent;
    }
  </style>
</head>
<body>
  <div class="eyebrow">
    <span class="pip"></span>
    <span>Guide</span>
    <span class="stat"><b>${steps.length}</b> Steps</span>
  </div>
  <h1>${guideTitle}</h1>
  ${guideDescHtml}
  <div class="steps">
    ${stepsHtml}
  </div>
</body>
</html>`;

  return new Blob([html], { type: "text/html" });
}
