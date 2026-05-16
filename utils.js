/**
 * LocalGuide — shared pure utilities.
 *
 * UMD pattern: loads as a CommonJS module in Jest (require('./utils'))
 * and as a global (window.LocalGuide) when included via <script> in the extension.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LocalGuide = factory();
  }
}(typeof window !== 'undefined' ? window : global, function () {

  // ── String helpers ──────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // ── DOM helpers ─────────────────────────────────────────────────────────────

  /**
   * Derives a human-readable label from a clicked DOM element.
   * Priority: id > inner text (truncated) > class names > tag name.
   */
  function extractElementInfo(target) {
    let info = target.tagName.toLowerCase();

    if (target.id) {
      info += `#${target.id}`;
    } else if (target.innerText && target.innerText.trim() !== '') {
      info = `'${target.innerText.trim().substring(0, 30)}'`;
    } else if (target.className && typeof target.className === 'string') {
      const classes = target.className.split(' ').filter(Boolean).join('.');
      if (classes) info += `.${classes}`;
    }

    return info;
  }

  // ── Popup helpers ───────────────────────────────────────────────────────────

  /**
   * Returns the step-count string shown in the popup.
   * Returns '' when count is 0 so the element stays hidden.
   */
  function formatStepCount(count, isRecording) {
    if (count === 0) return '';
    const label = count === 1 ? 'step' : 'steps';
    return isRecording ? `${count} ${label} captured` : `${count} ${label} in vault`;
  }

  // ── Export builders ─────────────────────────────────────────────────────────

  /**
   * Builds a self-contained HTML string for the workflow export.
   * All images are embedded as base64 data URIs.
   */
  function buildHTMLString(steps) {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const cards = steps.map((step, i) => `
    <div class="card">
      <div class="card-header">
        <div class="badge">${i + 1}</div>
        <div>
          <div class="label">Clicked</div>
          <div class="title">${escapeHtml(step.elementInfo)}</div>
        </div>
      </div>
      <div class="img-wrap">
        <img src="${step.image}" alt="Step ${i + 1}">
      </div>
      <div class="timestamp">${new Date(step.timestamp).toLocaleString()}</div>
    </div>`).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LocalGuide Workflow</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif; background: #0f0f11; color: #e0e0e0; padding: 48px 20px; }
    .page-header { text-align: center; margin-bottom: 52px; }
    .page-title { font-size: 32px; font-weight: 700; background: linear-gradient(90deg, #bb86fc, #7c4dff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .page-meta { margin-top: 8px; font-size: 14px; color: #666; }
    .steps { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px; }
    .card { background: #1a1a1d; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.35); }
    .card-header { display: flex; align-items: center; gap: 14px; padding: 16px 24px; background: #232326; border-bottom: 1px solid #2e2e32; }
    .badge { width: 30px; height: 30px; background: #bb86fc; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
    .label { font-size: 11px; color: #777; text-transform: uppercase; letter-spacing: .05em; }
    .title { font-size: 15px; font-weight: 600; color: #fff; margin-top: 3px; }
    .img-wrap { padding: 20px 24px; background: #111113; text-align: center; }
    .img-wrap img { max-width: 100%; border-radius: 6px; border: 1px solid #2e2e32; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
    .timestamp { padding: 12px 24px; font-size: 12px; color: #555; border-top: 1px solid #1f1f22; }
    @media print {
      body { background: #fff !important; color: #111 !important; padding: 0; }
      .page-title { -webkit-text-fill-color: #6200ea !important; background: none !important; }
      .page-meta { color: #555 !important; }
      .steps { gap: 0; }
      .card { background: #fff !important; border: 1px solid #ddd; border-radius: 0; box-shadow: none; page-break-after: always; margin-bottom: 0; }
      .card-header { background: #f8f4ff !important; border-color: #e0d6f5 !important; }
      .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .label { color: #555 !important; }
      .title { color: #111 !important; }
      .img-wrap { background: #fff !important; }
      .img-wrap img { border-color: #ddd !important; box-shadow: none !important; }
      .timestamp { color: #888 !important; border-color: #eee !important; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="page-title">LocalGuide Workflow</div>
    <div class="page-meta">${steps.length} step${steps.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Generated ${dateStr}</div>
  </div>
  <div class="steps">
    ${cards}
  </div>
</body>
</html>`;
  }

  /**
   * Builds a Word-compatible HTML string (.doc format).
   * Word and LibreOffice open this natively; their engines handle Arabic/RTL.
   */
  function buildWordString(steps) {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const stepBlocks = steps.map((step, i) => `
    <div style="page-break-before: ${i > 0 ? 'always' : 'auto'}; padding: 0 0 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:12px;">
        <tr>
          <td width="36" style="vertical-align:middle;">
            <div style="width:32px;height:32px;background:#bb86fc;border-radius:50%;text-align:center;line-height:32px;font-weight:700;font-size:14px;color:#000;">${i + 1}</div>
          </td>
          <td style="vertical-align:middle;padding-left:12px;">
            <div style="font-size:9pt;color:#888;text-transform:uppercase;letter-spacing:.05em;">Clicked</div>
            <div style="font-size:14pt;font-weight:600;color:#1a1a1d;">${escapeHtml(step.elementInfo)}</div>
          </td>
        </tr>
      </table>
      <div style="text-align:center;background:#f5f5f7;border-radius:8px;padding:16px;border:1px solid #e0e0e0;">
        <img src="${step.image}" style="max-width:100%;border-radius:4px;border:1px solid #ddd;">
      </div>
      <div style="margin-top:8px;font-size:9pt;color:#999;">${new Date(step.timestamp).toLocaleString()}</div>
    </div>`).join('\n');

    return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word"
  xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>LocalGuide Workflow</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: Calibri, "Segoe UI", Arial, sans-serif; margin: 48px; color: #222; }
    h1 { font-size: 22pt; color: #6200ea; border-bottom: 2px solid #bb86fc; padding-bottom: 8px; margin-bottom: 6px; }
    .meta { font-size: 10pt; color: #888; margin-bottom: 32px; }
  </style>
</head>
<body>
  <h1>LocalGuide Workflow</h1>
  <div class="meta">${steps.length} step${steps.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Generated ${dateStr}</div>
  ${stepBlocks}
</body>
</html>`;
  }

  return { escapeHtml, extractElementInfo, formatStepCount, buildHTMLString, buildWordString };
}));
