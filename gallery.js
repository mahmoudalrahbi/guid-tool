document.addEventListener('DOMContentLoaded', () => {
  const stepsList = document.getElementById('stepsList');
  const emptyState = document.getElementById('emptyState');
  const clearBtn = document.getElementById('clearBtn');

  // Shared drag state for reordering
  let dragSrcIndex = null;

  function renderSteps() {
    chrome.storage.local.get(['steps'], (data) => {
      const steps = Array.isArray(data.steps) ? data.steps : [];
      stepsList.innerHTML = '';

      if (steps.length === 0) {
        emptyState.style.display = 'block';
        stepsList.style.display = 'none';
        return;
      }

      emptyState.style.display = 'none';
      stepsList.style.display = 'flex';

      steps.forEach((step, index) => {
        // ── Card shell ───────────────────────────────────────────────────────
        const card = document.createElement('div');
        card.className = 'step-card';
        card.draggable = true;

        // ── Drag-and-drop ────────────────────────────────────────────────────
        card.addEventListener('dragstart', () => {
          dragSrcIndex = index;
          card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          dragSrcIndex = null;
        });
        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', () => {
          card.classList.remove('drag-over');
        });
        card.addEventListener('drop', (e) => {
          e.preventDefault();
          card.classList.remove('drag-over');
          const src = dragSrcIndex;
          if (src === null || src === index) return;
          chrome.storage.local.get(['steps'], (latest) => {
            const fresh = Array.isArray(latest.steps) ? latest.steps : [];
            const [moved] = fresh.splice(src, 1);
            fresh.splice(index, 0, moved);
            chrome.storage.local.set({ steps: fresh }, () => renderSteps());
          });
        });

        // ── Header ───────────────────────────────────────────────────────────
        const header = document.createElement('div');
        header.className = 'step-header';

        const number = document.createElement('div');
        number.className = 'step-number';
        number.textContent = index + 1;

        const titleContainer = document.createElement('div');
        titleContainer.className = 'step-title-container';

        const prefix = document.createElement('span');
        prefix.className = 'step-prefix';
        prefix.textContent = 'Clicked ';

        const title = document.createElement('input');
        title.className = 'step-title-input';
        title.value = step.elementInfo;

        title.addEventListener('focus', () => {
          title.classList.add('focused');
        });

        title.addEventListener('blur', () => {
          title.classList.remove('focused');
          const newVal = title.value.trim();
          if (!newVal) {
            title.value = step.elementInfo; // restore if emptied
            return;
          }
          if (newVal === step.elementInfo) return; // no change, skip write
          step.elementInfo = newVal; // keep guard in sync for future blurs
          chrome.storage.local.get(['steps'], (latest) => {
            const fresh = Array.isArray(latest.steps) ? latest.steps : [];
            if (fresh[index]) fresh[index].elementInfo = newVal;
            chrome.storage.local.set({ steps: fresh }, () => {
              if (chrome.runtime.lastError) {
                console.error('Title save failed:', chrome.runtime.lastError.message);
              }
            });
          });
        });

        // ── Delete button ────────────────────────────────────────────────────
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.textContent = '✕';
        deleteBtn.title = 'Delete this step';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!confirm(`Delete step ${index + 1}?`)) return;
          chrome.storage.local.get(['steps'], (latest) => {
            const fresh = Array.isArray(latest.steps) ? latest.steps : [];
            fresh.splice(index, 1);
            chrome.storage.local.set({ steps: fresh }, () => {
              if (!chrome.runtime.lastError) renderSteps();
            });
          });
        });

        titleContainer.appendChild(prefix);
        titleContainer.appendChild(title);
        header.appendChild(number);
        header.appendChild(titleContainer);
        header.appendChild(deleteBtn);

        // ── Screenshot ───────────────────────────────────────────────────────
        const img = document.createElement('img');
        img.className = 'step-image';
        img.src = step.image;
        img.alt = `Step ${index + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';

        // ── Footer ───────────────────────────────────────────────────────────
        const footer = document.createElement('div');
        footer.className = 'step-footer';
        footer.textContent = new Date(step.timestamp).toLocaleString();

        card.appendChild(header);
        card.appendChild(img);
        card.appendChild(footer);
        stepsList.appendChild(card);
      });
    });
  }

  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all recorded steps?')) {
      chrome.runtime.sendMessage({ action: 'clear_steps' }, () => {
        renderSteps();
      });
    }
  });

  // Populate empty state with icon
  emptyState.innerHTML = `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:16px">
      <circle cx="32" cy="32" r="30" stroke="#333" stroke-width="2"/>
      <circle cx="32" cy="32" r="14" fill="#bb86fc" opacity="0.7"/>
    </svg>
    <h2>No steps recorded yet</h2>
    <p>Open the extension popup and click <strong>Start Recording</strong> to capture your workflow.</p>
  `;

  renderSteps();
});
