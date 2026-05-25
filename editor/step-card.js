export function createStepElement(step, { onDescChange, onDelete, onAnnotationChange }) {
  const card = document.createElement("article");
  card.className = "step";
  card.setAttribute("draggable", "true");
  card.dataset.id = step.id;
  
  const imgUrl = URL.createObjectURL(step.screenshotBlob);
  const numStr = String(step.order).padStart(2, '0');
  const isClick = step.stepType === "click";

  card.innerHTML = `
    <div class="rail">
      <div class="drag-handle" title="Drag to reorder">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="3" cy="3" r="1"/><circle cx="7" cy="3" r="1"/><circle cx="3" cy="7" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="3" cy="11" r="1"/><circle cx="7" cy="11" r="1"/></svg>
      </div>
      <div class="step-num">${numStr}</div>
    </div>
    <div class="step-body">
      <div class="shot shot--${isClick ? 'click' : 'plain'}">
        <img class="shot-img" src="${imgUrl}" alt="Step ${numStr}">
        ${isClick ? '<svg class="annotation-svg" xmlns="http://www.w3.org/2000/svg"></svg>' : ''}
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

  // Set up draggable annotation overlay for click steps
  if (isClick) {
    const img = card.querySelector(".shot-img");
    const svg = card.querySelector(".annotation-svg");
    _setupAnnotationOverlay(img, svg, step, onAnnotationChange);
  }

  return card;
}

/**
 * Sets up the draggable SVG annotation circle overlay on a click-step screenshot.
 * The circle position is stored back in step.annotation.x / step.annotation.y
 * (CSS-pixel coords matching capture) and auto-save is triggered via onAnnotationChange.
 *
 * @param {HTMLImageElement} img              - The screenshot <img> element.
 * @param {SVGElement}       svg              - The overlay <svg> element.
 * @param {object}           step             - The step object (mutated on drag-end).
 * @param {function}         onAnnotationChange - Callback fired after annotation update.
 */
function _setupAnnotationOverlay(img, svg, step, onAnnotationChange) {
  const ann = step.annotation || {};
  const color = ann.color || "#f59e0b";
  const radiusPx = ann.radius || 28;

  // Create the draggable circle element inside the SVG namespace
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("fill", "none");
  circle.setAttribute("stroke", color);
  circle.setAttribute("stroke-width", "3");
  circle.style.cursor = "grab";
  svg.appendChild(circle);

  // Position the overlay and circle once the image has loaded (natural dimensions known)
  function positionOverlay() {
    const natW = img.naturalWidth || img.width || 1;
    const natH = img.naturalHeight || img.height || 1;

    // SVG viewBox matches natural image resolution so we can use annotation coords directly
    svg.setAttribute("viewBox", `0 0 ${natW} ${natH}`);
    svg.setAttribute("preserveAspectRatio", "none");

    const cx = ann.x != null ? ann.x : natW / 2;
    const cy = ann.y != null ? ann.y : natH / 2;

    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", radiusPx);
  }

  if (img.complete && img.naturalWidth) {
    positionOverlay();
  } else {
    img.addEventListener("load", positionOverlay, { once: true });
  }

  // --- Drag logic (pointer events for fine-grained control) ---
  let dragging = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startCx = 0;
  let startCy = 0;

  circle.addEventListener("pointerdown", (e) => {
    e.stopPropagation(); // prevent card-level drag-to-reorder
    e.preventDefault();
    circle.setPointerCapture(e.pointerId);
    dragging = true;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startCx = parseFloat(circle.getAttribute("cx")) || 0;
    startCy = parseFloat(circle.getAttribute("cy")) || 0;
    circle.style.cursor = "grabbing";
  });

  circle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    e.preventDefault();

    // Convert pointer delta (CSS px) to SVG/natural-image coordinate space
    const rect = svg.getBoundingClientRect();
    const natW = img.naturalWidth || 1;
    const natH = img.naturalHeight || 1;
    const scaleX = natW / (rect.width || 1);
    const scaleY = natH / (rect.height || 1);

    const dx = (e.clientX - startPointerX) * scaleX;
    const dy = (e.clientY - startPointerY) * scaleY;

    const newCx = Math.max(0, Math.min(natW, startCx + dx));
    const newCy = Math.max(0, Math.min(natH, startCy + dy));

    circle.setAttribute("cx", newCx);
    circle.setAttribute("cy", newCy);
  });

  circle.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    circle.style.cursor = "grab";

    const newCx = parseFloat(circle.getAttribute("cx")) || 0;
    const newCy = parseFloat(circle.getAttribute("cy")) || 0;

    // Persist back to the step's annotation in memory and trigger auto-save
    step.annotation = { ...ann, x: newCx, y: newCy };
    // Update local alias so subsequent drags use the updated position
    Object.assign(ann, step.annotation);

    if (typeof onAnnotationChange === "function") {
      onAnnotationChange();
    }
  });

  circle.addEventListener("pointercancel", () => {
    dragging = false;
    circle.style.cursor = "grab";
  });
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
