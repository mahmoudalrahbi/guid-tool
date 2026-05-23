import { getGuide, getStepsForGuide, saveGuide, saveStep, deleteStep } from "./db.js";
import { getExportFormats, exportGuide } from "./exports/registry.js";

import { showToast } from "./editor/toast.js";
import { setupExportMenu } from "./editor/export-menu.js";
import { createStepElement, renumber, autoSize } from "./editor/step-card.js";
import { attachDragAndDrop } from "./editor/drag-drop.js";

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
  
  // Setup Meta Chips
  const dateStr = `Recorded ${formatDate(guide.createdAt || Date.now())}`;
  
  const dateChip = document.getElementById("guideDateChip");
  if (dateChip) dateChip.querySelector("span").textContent = dateStr;

  if (guide.url) {
    try {
      const urlObj = new URL(guide.url);
      const domainChip = document.getElementById("guideDomainChip");
      if (domainChip) {
        domainChip.style.display = "inline-flex";
        domainChip.querySelector("span").textContent = urlObj.hostname;
      }
    } catch (e) {}
  }

  titleInput.addEventListener("input", () => {
    currentGuide.title = titleInput.value;
    flashSaving();
  });

  descInput.addEventListener("input", () => {
    currentGuide.description = descInput.value;
    autoSize(descInput);
    flashSaving();
  });

  setupExportMenu(exportMenu, exportDropdown, exportBtn, getExportFormats(), (formatId) => {
    exportGuide(formatId, currentGuide, currentSteps);
    showToast(toastHost, `Exported as ${formatId.toUpperCase()}`, CONFIG);
  });
  
  renderSteps();
}

function renderSteps() {
  stepsList.innerHTML = "";
  
  currentSteps.forEach((step, index) => {
    step.order = index + 1;
    const card = createStepElement(step, {
      onDescChange: flashSaving,
      onDelete: (cardEl) => handleDeleteStep(cardEl, step)
    });
    stepsList.appendChild(card);
    
    // Insert gap
    const gap = document.createElement("div");
    gap.className = "insert-gap";
    gap.innerHTML = `<button class="insert-btn">+ Insert</button>`;
    stepsList.appendChild(gap);
  });

  renumber(stepsList, stepCountBadge);
  attachDragAndDrop(stepsList, document, window, CONFIG, () => {
    renumber(stepsList, stepCountBadge);
    syncOrderAndSave();
  });
}

function handleDeleteStep(card, step) {
  const parent = card.parentNode;
  const gap = card.nextElementSibling?.classList.contains('insert-gap') ? card.nextElementSibling : null;
  const placeholderNext = card.nextElementSibling;
  
  card.remove();
  if (gap) gap.remove();
  
  renumber(stepsList, stepCountBadge);
  syncOrderAndSave();
  
  showToast(toastHost, 'Step deleted', CONFIG, async () => {
    // Undo
    if (placeholderNext) parent.insertBefore(card, placeholderNext); else parent.appendChild(card);
    if (gap) parent.insertBefore(gap, card.nextSibling);
    
    const stepDesc = card.querySelector(".step-desc");
    if (stepDesc) setTimeout(() => autoSize(stepDesc), 0);
    
    renumber(stepsList, stepCountBadge);
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
  saveTimeout = setTimeout(saveAll, CONFIG.EDITOR.AUTOSAVE_DEBOUNCE_MS);
}

async function saveAll() {
  currentGuide.updatedAt = Date.now();
  await saveGuide(currentGuide);
  await Promise.all(currentSteps.map(step => saveStep(step)));
  
  saveStatus.classList.remove('saving');
  
  saveWhen.textContent = `· ${formatDate(Date.now())}`;
}

init();
