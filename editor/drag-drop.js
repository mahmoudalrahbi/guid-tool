export function createDragDrop(stepsList, options) {
  let dragSrc = null;
  let scrollRaf = null;
  let scrollVelocity = 0;
  
  const documentObj = options.document || globalThis.document;
  const windowObj = options.window || globalThis.window;
  const config = options.config;
  const onReorder = options.onReorder;

  function autoScroll() {
    if (!scrollVelocity) return;
    windowObj.scrollBy(0, scrollVelocity);
    scrollRaf = windowObj.requestAnimationFrame(autoScroll);
  }

  function handleDocumentDragOver(e) {
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
      scrollRaf = windowObj.requestAnimationFrame(autoScroll);
    } else if (scrollVelocity === 0 && scrollRaf) {
      windowObj.cancelAnimationFrame(scrollRaf);
      scrollRaf = null;
    }
  }

  function handleDocumentDragEnd() {
    if (scrollRaf) {
      windowObj.cancelAnimationFrame(scrollRaf);
      scrollRaf = null;
      scrollVelocity = 0;
    }
  }

  function handleListDragStart(e) {
    const step = e.target.closest('.step');
    if (!step) return;
    dragSrc = step;
    step.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  function handleListDragEnd(e) {
    const step = e.target.closest('.step');
    if (step) step.classList.remove('dragging');
    documentObj.querySelectorAll('.step.drag-over').forEach(x => x.classList.remove('drag-over'));
    dragSrc = null;
  }

  function handleListDragOver(e) {
    e.preventDefault();
    const step = e.target.closest('.step');
    if (!step || !dragSrc || dragSrc === step) return;
    step.classList.add('drag-over');
  }

  function handleListDragLeave(e) {
    const step = e.target.closest('.step');
    if (step) step.classList.remove('drag-over');
  }

  function handleListDrop(e) {
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
  }

  documentObj.addEventListener('dragover', handleDocumentDragOver);
  documentObj.addEventListener('dragend', handleDocumentDragEnd);
  
  stepsList.addEventListener('dragstart', handleListDragStart);
  stepsList.addEventListener('dragend', handleListDragEnd);
  stepsList.addEventListener('dragover', handleListDragOver);
  stepsList.addEventListener('dragleave', handleListDragLeave);
  stepsList.addEventListener('drop', handleListDrop);

  return {
    destroy: () => {
      documentObj.removeEventListener('dragover', handleDocumentDragOver);
      documentObj.removeEventListener('dragend', handleDocumentDragEnd);
      
      stepsList.removeEventListener('dragstart', handleListDragStart);
      stepsList.removeEventListener('dragend', handleListDragEnd);
      stepsList.removeEventListener('dragover', handleListDragOver);
      stepsList.removeEventListener('dragleave', handleListDragLeave);
      stepsList.removeEventListener('drop', handleListDrop);
      
      if (scrollRaf) {
        windowObj.cancelAnimationFrame(scrollRaf);
        scrollRaf = null;
      }
    }
  };
}
