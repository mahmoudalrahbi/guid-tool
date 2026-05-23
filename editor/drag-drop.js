let dragSrc = null;
let scrollRaf = null;
let scrollVelocity = 0;

export function autoScroll(windowObj) {
  if (!scrollVelocity) return;
  windowObj.scrollBy(0, scrollVelocity);
  scrollRaf = windowObj.requestAnimationFrame(() => autoScroll(windowObj));
}

export function setupDragScroll(documentObj, windowObj, config) {
  documentObj.addEventListener('dragover', (e) => {
    if (!dragSrc) return;
    e.preventDefault();
    
    const threshold = config.UI_DRAG_THRESHOLD;
    const y = e.clientY;
    const h = windowObj.innerHeight;
    
    if (y < threshold) {
      scrollVelocity = -Math.max(5, ((threshold - y) / threshold) * 20);
    } else if (y > h - threshold) {
      scrollVelocity = Math.max(5, ((y - (h - threshold)) / threshold) * 20);
    } else {
      scrollVelocity = 0;
    }
    
    if (scrollVelocity !== 0 && !scrollRaf) {
      scrollRaf = windowObj.requestAnimationFrame(() => autoScroll(windowObj));
    } else if (scrollVelocity === 0 && scrollRaf) {
      windowObj.cancelAnimationFrame(scrollRaf);
      scrollRaf = null;
    }
  });

  documentObj.addEventListener('dragend', () => {
    if (scrollRaf) {
      windowObj.cancelAnimationFrame(scrollRaf);
      scrollRaf = null;
      scrollVelocity = 0;
    }
  });
}

export function attachDragAndDrop(stepsList, documentObj, windowObj, config, onReorder) {
  if (!stepsList.dataset.dragScrollInitialized) {
    setupDragScroll(documentObj, windowObj, config);
    stepsList.dataset.dragScrollInitialized = "true";
  }

  stepsList.addEventListener('dragstart', (e) => {
    const step = e.target.closest('.step');
    if (!step) return;
    dragSrc = step;
    step.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  });

  stepsList.addEventListener('dragend', (e) => {
    const step = e.target.closest('.step');
    if (step) step.classList.remove('dragging');
    documentObj.querySelectorAll('.step.drag-over').forEach(x => x.classList.remove('drag-over'));
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
    
    if (onReorder) onReorder();
  });
}
