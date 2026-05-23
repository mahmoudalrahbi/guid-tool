export function createAutoSave(saveFn, { debounceMs, onSaving, onSaved }) {
  let timeout = null;

  return function schedule() {
    if (onSaving) onSaving();
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(async () => {
      timeout = null;
      try {
        await saveFn();
        if (onSaved) onSaved(true);
      } catch (err) {
        if (onSaved) onSaved(false, err);
      }
    }, debounceMs);
  };
}
