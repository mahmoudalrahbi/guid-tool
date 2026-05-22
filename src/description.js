const MAX_LABEL_LENGTH = 80;

function cleanLabel(value) {
  if (typeof value !== 'string') return '';
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= MAX_LABEL_LENGTH) return collapsed;
  return collapsed.slice(0, MAX_LABEL_LENGTH) + '…';
}

function describeStep(metadata) {
  if (!metadata || typeof metadata !== 'object') return '';

  const label = cleanLabel(metadata.ariaLabel)
    || cleanLabel(metadata.text)
    || cleanLabel(metadata.placeholder)
    || cleanLabel(metadata.title);

  if (label) return `Click "${label}"`;

  const role = typeof metadata.role === 'string' ? metadata.role.trim() : '';
  if (role) return `Click ${role}`;

  const tag = typeof metadata.tagName === 'string' ? metadata.tagName.trim().toLowerCase() : '';
  if (tag) return `Click ${tag}`;

  return '';
}

function extractElementMetadata(element) {
  if (!element) return {};
  const text = element.innerText || element.textContent || '';
  return {
    tagName: element.tagName,
    role: element.getAttribute ? element.getAttribute('role') || '' : '',
    ariaLabel: element.getAttribute ? element.getAttribute('aria-label') || '' : '',
    placeholder: element.getAttribute ? element.getAttribute('placeholder') || '' : '',
    title: element.getAttribute ? element.getAttribute('title') || '' : '',
    text: typeof text === 'string' ? text.slice(0, 200) : '',
  };
}

const __api = { describeStep, extractElementMetadata };
if (typeof module !== 'undefined' && module.exports) {
  module.exports = __api;
}
if (typeof self !== 'undefined') {
  self.LocalGuide = Object.assign(self.LocalGuide || {}, __api);
}
