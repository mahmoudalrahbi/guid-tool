const stepListEl = document.getElementById('stepList');
const emptyStateEl = document.getElementById('emptyState');
const completeBtn = document.getElementById('completeBtn');

async function getSession() {
  const response = await chrome.runtime.sendMessage({ action: 'get_session' });
  return response && response.session ? response.session : null;
}

async function render() {
  const session = await getSession();
  if (!session || !session.guideId) {
    emptyStateEl.style.display = '';
    stepListEl.innerHTML = '';
    return;
  }
  const steps = await self.LocalGuide.getStepsForGuide(session.guideId);
  emptyStateEl.style.display = steps.length === 0 ? '' : 'none';
  stepListEl.innerHTML = '';
  for (const [index, step] of steps.entries()) {
    const li = document.createElement('li');
    li.className = 'step';

    const number = document.createElement('span');
    number.className = 'step-number';
    number.textContent = `Step ${index + 1}`;

    const body = document.createElement('div');
    body.className = 'step-body';

    const desc = document.createElement('p');
    desc.className = 'step-description';
    desc.textContent = step.description || 'Describe this Step';
    body.appendChild(desc);

    if (step.screenshotBlob) {
      const img = document.createElement('img');
      img.className = 'step-thumb';
      img.alt = `Step ${index + 1} screenshot`;
      img.src = URL.createObjectURL(step.screenshotBlob);
      body.appendChild(img);
    }

    li.appendChild(number);
    li.appendChild(body);
    stepListEl.appendChild(li);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.action === 'step_added') {
    render();
  }
});

completeBtn.addEventListener('click', async () => {
  completeBtn.disabled = true;
  const response = await chrome.runtime.sendMessage({ action: 'complete_capture' });
  if (!response || !response.success) {
    completeBtn.disabled = false;
    console.error('LocalGuide: complete capture failed', response);
  }
});

render();
