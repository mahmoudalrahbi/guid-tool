export function showToast(toastHost, msg, config, undoFn = null) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="pip"></span><span>${msg}</span>`;
  let dismissed = false;
  if (undoFn) {
    const b = document.createElement('button');
    b.textContent = 'Undo';
    b.onclick = () => { dismissed = true; undoFn(); t.remove(); };
    t.appendChild(b);
  }
  toastHost.appendChild(t);
  setTimeout(() => {
    if (dismissed) return;
    t.style.transition = `opacity ${config.UI_TOAST_ANIMATION_MS}ms`;
    t.style.opacity = '0';
    setTimeout(() => {
      if (!dismissed) t.remove();
    }, config.UI_TOAST_FADEOUT_MS);
  }, config.EDITOR.UNDO_TIMEOUT_MS);
}
