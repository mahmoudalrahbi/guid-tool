// Robust Delete Button
document.querySelectorAll('.delete-btn').forEach(btn => {
  btn.onclick = function(e) {
    e.preventDefault();
    const card = this.closest('.step-card');
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        card.remove();
        // Renumber
        document.querySelectorAll('.step-number').forEach((el, index) => {
          el.textContent = index + 1;
        });
      }, 200);
    }
  };
});

// Robust Native Drag and Drop (Handle based)
const container = document.querySelector('.steps-container');
let draggedItem = null;

document.querySelectorAll('.step-card').forEach(card => {
  const handle = card.querySelector('.drag-handle');
  
  // Only drag from handle
  handle.addEventListener('mousedown', () => {
    card.setAttribute('draggable', 'true');
  });
  handle.addEventListener('mouseup', () => {
    card.removeAttribute('draggable');
  });
  handle.addEventListener('mouseleave', () => {
    card.removeAttribute('draggable');
  });

  card.addEventListener('dragstart', function(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'step'); // Required for Firefox
    setTimeout(() => this.style.opacity = '0.4', 0);
  });
  
  card.addEventListener('dragend', function() {
    this.style.opacity = '1';
    this.removeAttribute('draggable');
    draggedItem = null;
    
    // Renumber
    document.querySelectorAll('.step-number').forEach((el, index) => {
      el.textContent = index + 1;
    });
  });
  
  card.addEventListener('dragover', function(e) {
    e.preventDefault(); // Necessary to allow dropping
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
      const allCards = [...container.querySelectorAll('.step-card')];
      const draggedIdx = allCards.indexOf(draggedItem);
      const droppedIdx = allCards.indexOf(this);
      
      if (draggedIdx < droppedIdx) {
        this.parentNode.insertBefore(draggedItem, this.nextSibling);
      } else {
        this.parentNode.insertBefore(draggedItem, this);
      }
    }
    return false;
  });
});
