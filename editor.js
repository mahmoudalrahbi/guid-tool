const params = new URLSearchParams(window.location.search);
const guideId = params.get('guideId');
const titleEl = document.getElementById('guideTitle');
const containerEl = document.getElementById('stepsContainer');
const exportBtn = document.getElementById('exportBtn');

let cachedGuide = null;
let cachedSteps = [];

async function loadGuide() {
  if (!guideId) {
    titleEl.textContent = 'No Guide selected';
    containerEl.innerHTML = '<div class="empty">No guideId in URL.</div>';
    exportBtn.disabled = true;
    return;
  }
  const guide = await self.LocalGuide.getGuide(guideId);
  if (!guide) {
    titleEl.textContent = 'Guide not found';
    containerEl.innerHTML = '<div class="empty">No Guide with that id in IndexedDB.</div>';
    exportBtn.disabled = true;
    return;
  }
  const steps = await self.LocalGuide.getStepsForGuide(guideId);
  cachedGuide = guide;
  cachedSteps = steps;
  titleEl.textContent = guide.title;
  render(guide, steps);
}

function render(guide, steps) {
  if (steps.length === 0) {
    containerEl.innerHTML = '<div class="empty">No Steps in this Guide.</div>';
    return;
  }
  containerEl.innerHTML = '';
  for (const [index, step] of steps.entries()) {
    const section = document.createElement('section');
    section.className = 'step';

    const label = document.createElement('div');
    label.className = 'step-label';
    label.textContent = `Step ${index + 1}`;
    section.appendChild(label);

    const desc = document.createElement('p');
    if (step.description && step.description.trim()) {
      desc.className = 'step-description';
      desc.textContent = step.description;
    } else {
      desc.className = 'step-description placeholder';
      desc.textContent = 'Describe this Step';
    }
    section.appendChild(desc);

    if (step.screenshotBlob) {
      const img = document.createElement('img');
      img.alt = `Step ${index + 1} screenshot`;
      img.src = URL.createObjectURL(step.screenshotBlob);
      section.appendChild(img);
    }
    containerEl.appendChild(section);
  }
}

exportBtn.addEventListener('click', async () => {
  if (!cachedGuide) return;
  const blob = await self.LocalGuide.exportHtml({
    title: cachedGuide.title,
    description: cachedGuide.description,
    steps: cachedSteps,
  });
  const url = URL.createObjectURL(blob);
  const safeTitle = (cachedGuide.title || 'guide').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const filename = `${safeTitle || 'guide'}.html`;
  if (chrome && chrome.downloads && chrome.downloads.download) {
    chrome.downloads.download({ url, filename, saveAs: true });
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
});

loadGuide();
