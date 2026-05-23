export function createStepElement(step, { onDescChange, onDelete }) {
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
        <textarea class="step-desc" rows="2" placeholder="Describe this step...">${window.escapeHtml(step.description)}</textarea>
      </div>
      <div class="step-foot">
        <span class="step-url">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5L6.5 4.5M3 5l-1 1a2 2 0 1 0 2.8 2.8l1-1M8 6l1-1a2 2 0 1 0-2.8-2.8L5 3"/></svg>
          ${window.escapeHtml((step.url || "Local file").replace(/^https?:\/\//, ''))}
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
    onDescChange(textarea.value);
  });

  const delBtn = card.querySelector(".del-btn");
  delBtn.addEventListener("click", () => {
    onDelete(card);
  });

  return card;
}

export function autoSize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

export function renumber(stepsList, stepCountBadge) {
  const stepElements = Array.from(stepsList.querySelectorAll('.step'));
  stepElements.forEach((s, i) => {
    const numEl = s.querySelector('.step-num');
    if (numEl) numEl.textContent = String(i + 1).padStart(2, '0');
  });
  
  stepCountBadge.textContent = stepElements.length;
  document.body.dataset.empty = stepElements.length === 0 ? 'true' : 'false';
}
