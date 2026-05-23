import { getGuide, getStepsForGuide, saveGuide, saveStep, deleteStep } from "./db.js";
import { getExportFormats, exportGuide } from "./exports/registry.js";

const params = new URLSearchParams(location.search);
const guideId = params.get("guideId");

const titleInput = document.getElementById("titleInput");
const descInput = document.getElementById("descInput");
const stepsList = document.getElementById("stepsList");
const saveStatus = document.getElementById("saveStatus");
const saveWhen = document.getElementById("saveWhen");
const stepCountBadge = document.getElementById("stepCountBadge");
const exportDropdown = document.getElementById("exportDropdown");
const exportBtn = document.getElementById("exportBtn");
const exportMenu = document.getElementById("exportMenu");
const toastHost = document.getElementById("toastHost");

let currentGuide = null;
let currentSteps = [];
let saveTimeout = null;

async function init() {
  if (!guideId) return;

  const [guide, steps] = await Promise.all([
    getGuide(guideId),
    getStepsForGuide(guideId),
  ]);

  if (!guide) return;

  currentGuide = guide;
  currentSteps = steps;

  titleInput.value = guide.title || "";
  descInput.value = guide.description || "";
  
  autoSize(descInput);

  titleInput.addEventListener("input", () => {
    currentGuide.title = titleInput.value;
    flashSaving();
  });

  descInput.addEventListener("input", () => {
    currentGuide.description = descInput.value;
    autoSize(descInput);
    flashSaving();
  });

  renderExportMenu();
  renderSteps();

  // Export dropdown toggling
  exportBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    exportDropdown.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!exportDropdown.contains(e.target)) exportDropdown.classList.remove("open");
  });
}

function renderExportMenu() {
  const formats = getExportFormats();
  exportMenu.innerHTML = "";
  
  formats.forEach(format => {
    const item = document.createElement("div");
    item.className = "item";
    item.dataset.fmt = format.id;
    
    // Determine icon based on format
    let svgPath = "";
    if (format.id === "html") svgPath = `<path d="M2 3l1.5 6h6L11 3M4 6h5"/>`;
    else if (format.id === "pdf") svgPath = `<rect x="2.5" y="1.5" width="8" height="10" rx="1"/><path d="M4.5 4.5h4M4.5 6.5h4M4.5 8.5h2.5"/>`;
    else if (format.id === "docx") svgPath = `<rect x="2.5" y="1.5" width="8" height="10" rx="1"/><path d="M4 5l1 3.5L6.5 5l1.5 3.5L9 5"/>`;
    else if (format.id === "md") svgPath = `<rect x="1" y="3" width="11" height="7" rx="1"/><path d="M3 8V5l1.5 2L6 5v3M9 5v3M7.5 6.5L9 8l1.5-1.5"/>`;
    else svgPath = `<path d="M2.5 9V2a1 1 0 0 1 1-1h6"/>`;

    item.innerHTML = `
      <div class="ico">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
      </div>
      <div>
        <div>Export as ${format.name}</div>
      </div>
      <div class="meta">.${format.id}</div>
    `;
    
    item.addEventListener("click", () => {
      exportDropdown.classList.remove("open");
      exportGuide(format.id, currentGuide, currentSteps);
      showToast(`Exported as ${format.id.toUpperCase()}`);
    });
    
    exportMenu.appendChild(item);
  });
}

function renderSteps() {
  stepsList.innerHTML = "";
  
  currentSteps.forEach((step, index) => {
    step.order = index + 1;
    stepsList.appendChild(createStepElement(step));
    
    // Insert gap
    const gap = document.createElement("div");
    gap.className = "insert-gap";
    gap.innerHTML = `<button class="insert-btn">+ Insert</button>`;
    stepsList.appendChild(gap);
  });

  renumber();
  attachDragAndDrop();
}

function createStepElement(step) {
  const card = document.createElement("article");
  card.className = "step";
  card.setAttribute("draggable", "true");
  card.dataset.id = step.id;
  
  const imgUrl = URL.createObjectURL(step.screenshotBlob);
  const numStr = String(step.order).padStart(2, '0');

  card.innerHTML = `
    <div class="rail">
      <div class="drag-handle" title="Drag to reorder">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="3" cy="3" r="1"/><circle cx="7" cy="3" r="1"/><circle cx="3" cy="7" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="3" cy="11" r="1"/><circle cx="7" cy="11" r="1"/></svg>
      </div>
      <div class="step-num">${numStr}</div>
    </div>
    <div class="step-body">
      <div class="shot">
        <img src="${imgUrl}" alt="Step ${numStr}">
        <div class="shot-overlay">
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M5 1v8M1 5h8"/></svg>
          <span>Click</span>
        </div>
      </div>
      <div class="step-desc-wrap">
        <textarea class="step-desc" rows="2" placeholder="Describe this step...">${escapeHtml(step.description)}</textarea>
      </div>
      <div class="step-foot">
        <span class="step-url">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5L6.5 4.5M3 5l-1 1a2 2 0 1 0 2.8 2.8l1-1M8 6l1-1a2 2 0 1 0-2.8-2.8L5 3"/></svg>
          ${escapeHtml(step.url || "Local file")}
        </span>
      </div>
    </div>
    <div class="step-tools">
      <button class="ico-btn danger del-btn" title="Delete step">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.5h7M5 3V2h2v1M3.5 3.5l.5 6.5h4l.5-6.5M5 5.5v3M7 5.5v3"/></svg>
      </button>
    </div>
  `;

  const textarea = card.querySelector(".step-desc");
  setTimeout(() => autoSize(textarea), 0);
  textarea.addEventListener("input", () => {
    step.description = textarea.value;
    autoSize(textarea);
    flashSaving();
  });

  const delBtn = card.querySelector(".del-btn");
  delBtn.addEventListener("click", () => {
    const parent = card.parentNode;
    const gap = card.nextElementSibling?.classList.contains('insert-gap') ? card.nextElementSibling : null;
    const placeholderNext = card.nextElementSibling;
    
    card.remove();
    if (gap) gap.remove();
    
    renumber();
    syncOrderAndSave();
    
    showToast('Step deleted', async () => {
      // Undo
      if (placeholderNext) parent.insertBefore(card, placeholderNext); else parent.appendChild(card);
      if (gap) parent.insertBefore(gap, card.nextSibling);
      
      const stepDesc = card.querySelector(".step-desc");
      if (stepDesc) setTimeout(() => autoSize(stepDesc), 0);
      
      renumber();
      syncOrderAndSave();
    });
  });

  return card;
}

function autoSize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function renumber() {
  const stepElements = Array.from(stepsList.querySelectorAll('.step'));
  stepElements.forEach((s, i) => {
    const numEl = s.querySelector('.step-num');
    if (numEl) numEl.textContent = String(i + 1).padStart(2, '0');
  });
  
  stepCountBadge.textContent = stepElements.length;
  document.body.dataset.empty = stepElements.length === 0 ? 'true' : 'false';
}

let dragSrc = null;
let scrollRaf = null;
let scrollVelocity = 0;

function autoScroll() {
  if (!scrollVelocity) return;
  window.scrollBy(0, scrollVelocity);
  scrollRaf = requestAnimationFrame(autoScroll);
}

document.addEventListener('dragover', (e) => {
  if (!dragSrc) return;
  e.preventDefault();
  
  const threshold = 80;
  const y = e.clientY;
  const h = window.innerHeight;
  
  if (y < threshold) {
    scrollVelocity = -Math.max(5, ((threshold - y) / threshold) * 20);
  } else if (y > h - threshold) {
    scrollVelocity = Math.max(5, ((y - (h - threshold)) / threshold) * 20);
  } else {
    scrollVelocity = 0;
  }
  
  if (scrollVelocity !== 0 && !scrollRaf) {
    scrollRaf = requestAnimationFrame(autoScroll);
  } else if (scrollVelocity === 0 && scrollRaf) {
    cancelAnimationFrame(scrollRaf);
    scrollRaf = null;
  }
});

document.addEventListener('dragend', () => {
  if (scrollRaf) {
    cancelAnimationFrame(scrollRaf);
    scrollRaf = null;
    scrollVelocity = 0;
  }
});

function attachDragAndDrop() {
  stepsList.addEventListener('dragstart', (e) => {
    const step = e.target.closest('.step');
    if (!step) return;
    dragSrc = step;
    step.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  stepsList.addEventListener('dragend', (e) => {
    const step = e.target.closest('.step');
    if (step) step.classList.remove('dragging');
    document.querySelectorAll('.step.drag-over').forEach(x => x.classList.remove('drag-over'));
    dragSrc = null;
  });

  stepsList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const step = e.target.closest('.step');
    if (!step || !dragSrc || dragSrc === step) return;
    step.classList.add('drag-over');
  });

  stepsList.addEventListener('dragleave', (e) => {
    const step = e.target.closest('.step');
    if (step) step.classList.remove('drag-over');
  });

  stepsList.addEventListener('drop', (e) => {
    e.preventDefault();
    const step = e.target.closest('.step');
    if (!step || !dragSrc || dragSrc === step) return;
    step.classList.remove('drag-over');
    
    const all = [...stepsList.children];
    const srcIdx = all.indexOf(dragSrc);
    const tgtIdx = all.indexOf(step);
    
    const srcGap = dragSrc.nextElementSibling?.classList.contains('insert-gap') ? dragSrc.nextElementSibling : null;
    
    if (srcIdx < tgtIdx) {
      step.parentNode.insertBefore(dragSrc, step.nextElementSibling);
      if (srcGap) step.parentNode.insertBefore(srcGap, dragSrc.nextElementSibling);
    } else {
      step.parentNode.insertBefore(dragSrc, step);
      if (srcGap) step.parentNode.insertBefore(srcGap, dragSrc.nextElementSibling);
    }
    
    renumber();
    syncOrderAndSave();
  });
}

function syncOrderAndSave() {
  const domCards = [...stepsList.querySelectorAll('.step')];
  const newStepsOrder = [];
  
  domCards.forEach((card, index) => {
    const id = card.dataset.id;
    const step = currentSteps.find(s => s.id === id);
    if (step) {
      step.order = index + 1;
      newStepsOrder.push(step);
    }
  });

  // Check if any step was removed
  const deletedSteps = currentSteps.filter(s => !newStepsOrder.includes(s));
  deletedSteps.forEach(s => deleteStep(s.id));
  
  currentSteps = newStepsOrder;
  flashSaving();
}

function flashSaving() {
  saveStatus.classList.add('saving');
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveAll, 700);
}

async function saveAll() {
  currentGuide.updatedAt = Date.now();
  await saveGuide(currentGuide);
  await Promise.all(currentSteps.map(step => saveStep(step)));
  
  saveStatus.classList.remove('saving');
  
  const date = new Date();
  const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  saveWhen.textContent = `· Today, ${timeStr}`;
}

function showToast(msg, undoFn = null) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="pip"></span><span>${msg}</span>`;
  if (undoFn) {
    const b = document.createElement('button');
    b.textContent = 'Undo';
    b.onclick = () => { undoFn(); t.remove(); };
    t.appendChild(b);
  }
  toastHost.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity 200ms';
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 220);
  }, 3800);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

init();
