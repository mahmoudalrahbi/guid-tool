import { getGuide, getStepsForGuide } from "./db.js";

const params = new URLSearchParams(location.search);
const guideId = params.get("guideId");

const loading = document.getElementById("loading");
const app = document.getElementById("app");
const guideTitleEl = document.getElementById("guideTitle");
const stepList = document.getElementById("stepList");
const exportBtn = document.getElementById("exportBtn");

async function init() {
  if (!guideId) {
    loading.textContent = "No guide ID provided.";
    return;
  }

  const [guide, steps] = await Promise.all([
    getGuide(guideId),
    getStepsForGuide(guideId),
  ]);

  if (!guide) {
    loading.textContent = "Guide not found.";
    return;
  }

  loading.style.display = "none";
  app.style.display = "block";

  guideTitleEl.textContent = guide.title;

  for (const step of steps) {
    const div = document.createElement("div");
    div.className = "step";

    const num = document.createElement("span");
    num.className = "step-num";
    num.textContent = step.order;

    const img = document.createElement("img");
    // screenshotBlob is a Blob stored in IndexedDB
    img.src = URL.createObjectURL(step.screenshotBlob);
    img.alt = `Step ${step.order} screenshot`;

    const desc = document.createElement("p");
    desc.textContent = step.description;

    div.appendChild(num);
    div.appendChild(img);
    div.appendChild(desc);
    stepList.appendChild(div);
  }

  exportBtn.addEventListener("click", () => exportHTML(guide, steps));
}

async function exportHTML(guide, steps) {
  // Convert each Blob to a base64 data URI for embedding
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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(guide.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #111; }
    h1 { font-size: 22px; margin-bottom: 24px; }
    .step { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid #e5e7eb; }
    .step-num { font-size: 12px; color: #9ca3af; min-width: 24px; padding-top: 4px; }
    .step img { width: 220px; border-radius: 6px; flex-shrink: 0; }
    .step p { margin: 0; color: #374151; }
  </style>
</head>
<body>
  <h1>${escapeHtml(guide.title)}</h1>
  ${stepsHtml}
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${guide.title.replace(/\s+/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

init();
