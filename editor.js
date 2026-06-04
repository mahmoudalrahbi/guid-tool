import { getGuide, getStepsForGuide, saveGuide, saveStep, deleteStep } from "./db.js";
import { getExportFormats, exportGuide } from "./exports/registry.js";

import { showToast } from "./editor/toast.js";
import { setupExportMenu } from "./editor/export-menu.js";
import { createStepElement, renumber, autoSize } from "./editor/step-card.js";
import { createDragDrop } from "./editor/drag-drop.js";
import { createEditorSession } from "./editor/editor-session.js";

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

let currentSteps = [];
let currentDragDrop = null;
let editorSession = null;

async function init() {
  if (!guideId) return;

  editorSession = createEditorSession(
    { getGuide, getStepsForGuide, saveGuide, saveStep },
    {
      debounceMs: CONFIG.EDITOR.AUTOSAVE_DEBOUNCE_MS,
      onSaving: () => {
        saveStatus.classList.add('saving');
      },
      onSaved: (success) => {
        if (success) {
          saveStatus.classList.remove('saving');
          saveWhen.textContent = `· ${window.formatDate(Date.now())}`;
        }
      },
    }
  );
  await editorSession.load(guideId);

  const guide = editorSession.getGuide();
  if (!guide) return;

  currentSteps = editorSession.getSteps();

  titleInput.value = guide.title || "";
  descInput.value = guide.description || "";

  autoSize(descInput);

  const dateStr = `Recorded ${window.formatDate(guide.createdAt || Date.now())}`;

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
    editorSession.updateTitle(titleInput.value);
  });

  descInput.addEventListener("input", () => {
    editorSession.updateDescription(descInput.value);
    autoSize(descInput);
  });

  setupExportMenu(exportMenu, exportDropdown, exportBtn, getExportFormats(), async (formatId) => {
    try {
      await editorSession.flush();
    } catch (e) {
      showToast(toastHost, 'Export failed — unsaved changes could not be written', CONFIG);
      return;
    }
    exportGuide(formatId, editorSession.getGuide(), editorSession.getSteps());
    showToast(toastHost, `Exported as ${formatId.toUpperCase()}`, CONFIG);
  });

  renderSteps();
}

function renderSteps() {
  stepsList.innerHTML = "";

  currentSteps.forEach((step, index) => {
    step.order = index + 1;
    const card = createStepElement(step, {
      onDescChange: () => editorSession.updateStepDescription(step.id, card.querySelector('.step-desc')?.value ?? ''),
      onDelete: (cardEl) => handleDeleteStep(cardEl, step),
      onAnnotationChange: () => editorSession.updateStepAnnotation(step.id),
    });
    stepsList.appendChild(card);

    const gap = document.createElement("div");
    gap.className = "insert-gap";
    gap.innerHTML = `<button class="insert-btn">+ Insert</button>`;
    stepsList.appendChild(gap);
  });

  renumber(stepsList, stepCountBadge);

  if (currentDragDrop) currentDragDrop.destroy();
  currentDragDrop = createDragDrop(stepsList, {
    document,
    window,
    config: CONFIG,
    onReorder: (fromIndex, toIndex) => {
      editorSession.reorder(fromIndex, toIndex);
      currentSteps = editorSession.getSteps();
      renumber(stepsList, stepCountBadge);
    }
  });
}

function handleDeleteStep(card, step) {
  const parent = card.parentNode;
  const gap = card.nextElementSibling?.classList.contains('insert-gap') ? card.nextElementSibling : null;
  const placeholderNext = gap ? gap.nextElementSibling : card.nextElementSibling;

  card.remove();
  if (gap) gap.remove();

  const token = editorSession.deleteStep(step.id);
  currentSteps = editorSession.getSteps();
  renumber(stepsList, stepCountBadge);

  showToast(toastHost, 'Step deleted', CONFIG, async () => {
    if (placeholderNext) parent.insertBefore(card, placeholderNext); else parent.appendChild(card);
    if (gap) parent.insertBefore(gap, card.nextSibling);

    editorSession.undoDelete(token);
    currentSteps = editorSession.getSteps();

    const stepDesc = card.querySelector(".step-desc");
    if (stepDesc) setTimeout(() => autoSize(stepDesc), 0);

    renumber(stepsList, stepCountBadge);
  });
}

init();
