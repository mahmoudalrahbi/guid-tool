import { getGuide, getStepsForGuide, saveGuide, saveStep, deleteStep } from "./db.js";

const params = new URLSearchParams(location.search);
const guideId = params.get("guideId");

const loading = document.getElementById("loading");
const app = document.getElementById("app");
const guideTitleInput = document.getElementById("guideTitleInput");
const guideDescInput = document.getElementById("guideDescInput");
const stepsContainer = document.getElementById("stepsContainer");
const exportBtn = document.getElementById("exportBtn");
const saveStatus = document.getElementById("saveStatus");

let currentGuide = null;
let currentSteps = [];
let saveTimeout = null;

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

  currentGuide = guide;
  currentSteps = steps;

  loading.style.display = "none";
  app.style.display = "block";

  guideTitleInput.value = guide.title || "";
  guideDescInput.value = guide.description || "";

  guideTitleInput.addEventListener("input", () => {
    currentGuide.title = guideTitleInput.value;
    scheduleSave();
  });

  guideDescInput.addEventListener("input", () => {
    currentGuide.description = guideDescInput.value;
    scheduleSave();
  });

  renderSteps();

  exportBtn.addEventListener("click", () => exportHTML());
}

function renderSteps() {
  stepsContainer.innerHTML = "";
  
  currentSteps.forEach((step, index) => {
    step.order = index + 1; // Ensure ordering is correct based on array index
    
    const card = document.createElement("div");
    card.className = "step-card";
    card.dataset.id = step.id;
    
    // Convert Blob to Object URL
    const imgUrl = URL.createObjectURL(step.screenshotBlob);

    card.innerHTML = `
      <div class="drag-handle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </div>
      <div class="step-content">
        <img class="step-image" src="${imgUrl}" alt="Step ${step.order}">
        <div class="step-details">
          <div class="step-header">
            <span class="step-number">${step.order}</span>
            <button class="delete-btn" title="Delete step">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
          </div>
          <textarea class="step-desc-input">${escapeHtml(step.description)}</textarea>
        </div>
      </div>
    `;

    // Handle Textarea edit
    const textarea = card.querySelector(".step-desc-input");
    textarea.addEventListener("input", () => {
      step.description = textarea.value;
      scheduleSave();
    });

    // Handle Delete
    const deleteBtn = card.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      
      // Update state
      currentSteps = currentSteps.filter(s => s.id !== step.id);
      
      setTimeout(async () => {
        await deleteStep(step.id);
        renderSteps();
        scheduleSave();
      }, 200);
    });

    stepsContainer.appendChild(card);
  });

  attachDragAndDrop();
}

function attachDragAndDrop() {
  let draggedItem = null;

  document.querySelectorAll('.step-card').forEach(card => {
    const handle = card.querySelector('.drag-handle');
    
    handle.addEventListener('mousedown', () => card.setAttribute('draggable', 'true'));
    handle.addEventListener('mouseup', () => card.removeAttribute('draggable'));
    handle.addEventListener('mouseleave', () => card.removeAttribute('draggable'));

    card.addEventListener('dragstart', function(e) {
      draggedItem = this;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'step'); 
      setTimeout(() => this.style.opacity = '0.4', 0);
    });
    
    card.addEventListener('dragend', function() {
      this.style.opacity = '1';
      this.removeAttribute('draggable');
      draggedItem = null;
    });
    
    card.addEventListener('dragover', function(e) {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = 'move';
      return false;
    });
    
    card.addEventListener('dragenter', function(e) {
      e.preventDefault();
      if (this !== draggedItem) {
        this.style.border = '2px dashed #3b82f6';
      }
    });
    
    card.addEventListener('dragleave', function() {
      this.style.border = '1px solid #334155';
    });
    
    card.addEventListener('drop', function(e) {
      e.preventDefault();
      this.style.border = '1px solid #334155';
      if (this !== draggedItem && draggedItem) {
        const allCards = [...stepsContainer.querySelectorAll('.step-card')];
        const draggedIdx = allCards.indexOf(draggedItem);
        const droppedIdx = allCards.indexOf(this);
        
        if (draggedIdx < droppedIdx) {
          this.parentNode.insertBefore(draggedItem, this.nextSibling);
        } else {
          this.parentNode.insertBefore(draggedItem, this);
        }

        // Sync visual order back to the array and db
        syncOrder();
      }
      return false;
    });
  });
}

function syncOrder() {
  const domCards = [...stepsContainer.querySelectorAll('.step-card')];
  const newStepsOrder = [];
  
  domCards.forEach((card, index) => {
    const id = card.dataset.id;
    const step = currentSteps.find(s => s.id === id);
    if (step) {
      step.order = index + 1;
      newStepsOrder.push(step);
      // Update DOM number visually
      card.querySelector('.step-number').textContent = step.order;
    }
  });

  currentSteps = newStepsOrder;
  scheduleSave();
}

function setSavingStatus(status) {
  if (status === "saving") {
    saveStatus.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Saving...`;
    saveStatus.className = "save-status";
  } else if (status === "saved") {
    saveStatus.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> All changes saved`;
    saveStatus.className = "save-status saved";
  }
}

function scheduleSave() {
  setSavingStatus("saving");
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveAll, 500);
}

async function saveAll() {
  await saveGuide(currentGuide);
  await Promise.all(currentSteps.map(step => saveStep(step)));
  setSavingStatus("saved");
}

async function exportHTML() {
  const stepsWithDataUrls = await Promise.all(
    currentSteps.map(async (step) => {
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

  const guideDescHtml = currentGuide.description ? `<p class="guide-desc">${escapeHtml(currentGuide.description)}</p>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(currentGuide.title)}</title>
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
  <h1>${escapeHtml(currentGuide.title)}</h1>
  ${guideDescHtml}
  ${stepsHtml}
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentGuide.title.replace(/\s+/g, "-")}.html`;
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
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

init();
