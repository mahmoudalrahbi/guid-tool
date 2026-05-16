const LocalGuide = require('../utils');

// ── escapeHtml ────────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  test('escapes ampersand', () => {
    expect(LocalGuide.escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('escapes opening and closing angle brackets', () => {
    expect(LocalGuide.escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  test('escapes double quotes', () => {
    expect(LocalGuide.escapeHtml('"value"')).toBe('&quot;value&quot;');
  });

  test('leaves plain text unchanged', () => {
    expect(LocalGuide.escapeHtml('hello world')).toBe('hello world');
  });

  test('escapes multiple entities in one string', () => {
    expect(LocalGuide.escapeHtml('<a href="x&y">')).toBe('&lt;a href=&quot;x&amp;y&quot;&gt;');
  });

  test('escapes a full XSS payload', () => {
    const input  = '<script>alert("xss")</script>';
    const output = LocalGuide.escapeHtml(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('&lt;script&gt;');
    expect(output).toContain('&quot;xss&quot;');
  });

  test('handles empty string', () => {
    expect(LocalGuide.escapeHtml('')).toBe('');
  });
});

// ── extractElementInfo ────────────────────────────────────────────────────────

describe('extractElementInfo', () => {
  test('uses id when present (highest priority)', () => {
    const el = { tagName: 'BUTTON', id: 'submit-btn', innerText: 'Submit', className: 'btn' };
    expect(LocalGuide.extractElementInfo(el)).toBe('button#submit-btn');
  });

  test('uses inner text when no id', () => {
    const el = { tagName: 'BUTTON', id: '', innerText: 'Click me', className: '' };
    expect(LocalGuide.extractElementInfo(el)).toBe("'Click me'");
  });

  test('truncates long inner text to 30 characters', () => {
    const el = { tagName: 'A', id: '', innerText: 'This is a very long link text that goes beyond thirty', className: '' };
    const result = LocalGuide.extractElementInfo(el);
    expect(result).toBe("'This is a very long link text '");
    expect(result.length).toBe(32); // 30 chars + 2 quotes
  });

  test('uses class names when no id or inner text', () => {
    const el = { tagName: 'DIV', id: '', innerText: '', className: 'btn btn-primary' };
    expect(LocalGuide.extractElementInfo(el)).toBe('div.btn.btn-primary');
  });

  test('falls back to tag name only when nothing else available', () => {
    const el = { tagName: 'SPAN', id: '', innerText: '', className: '' };
    expect(LocalGuide.extractElementInfo(el)).toBe('span');
  });

  test('treats whitespace-only inner text as empty (falls through to class)', () => {
    const el = { tagName: 'DIV', id: '', innerText: '   \n\t  ', className: 'wrapper' };
    expect(LocalGuide.extractElementInfo(el)).toBe('div.wrapper');
  });

  test('handles non-string className gracefully', () => {
    // SVG elements have className as an SVGAnimatedString object
    const el = { tagName: 'SVG', id: '', innerText: '', className: { baseVal: 'icon' } };
    expect(LocalGuide.extractElementInfo(el)).toBe('svg');
  });

  test('filters empty class tokens from class string', () => {
    const el = { tagName: 'SPAN', id: '', innerText: '', className: '  foo  bar  ' };
    expect(LocalGuide.extractElementInfo(el)).toBe('span.foo.bar');
  });
});

// ── formatStepCount ───────────────────────────────────────────────────────────

describe('formatStepCount', () => {
  test('returns empty string for 0 steps while recording', () => {
    expect(LocalGuide.formatStepCount(0, true)).toBe('');
  });

  test('returns empty string for 0 steps while not recording', () => {
    expect(LocalGuide.formatStepCount(0, false)).toBe('');
  });

  test('shows singular "step" when recording with 1 step', () => {
    expect(LocalGuide.formatStepCount(1, true)).toBe('1 step captured');
  });

  test('shows plural "steps" when recording with multiple steps', () => {
    expect(LocalGuide.formatStepCount(5, true)).toBe('5 steps captured');
  });

  test('shows "in vault" label when not recording', () => {
    expect(LocalGuide.formatStepCount(3, false)).toBe('3 steps in vault');
  });

  test('shows singular "step in vault" when not recording with 1 step', () => {
    expect(LocalGuide.formatStepCount(1, false)).toBe('1 step in vault');
  });
});

// ── buildHTMLString ───────────────────────────────────────────────────────────

const MOCK_STEPS = [
  {
    elementInfo: "button#login",
    image: 'data:image/jpeg;base64,/9j/abc123',
    timestamp: '2026-01-15T10:30:00.000Z',
  },
  {
    elementInfo: "'Submit'",
    image: 'data:image/jpeg;base64,/9j/def456',
    timestamp: '2026-01-15T10:31:00.000Z',
  },
];

describe('buildHTMLString', () => {
  let html;
  beforeAll(() => { html = LocalGuide.buildHTMLString(MOCK_STEPS); });

  test('produces a valid HTML document', () => {
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
  });

  test('includes correct step count in meta line', () => {
    expect(html).toContain('2 steps');
  });

  test('uses singular "step" for a single-step export', () => {
    const single = LocalGuide.buildHTMLString([MOCK_STEPS[0]]);
    expect(single).toContain('1 step ');
    expect(single).not.toContain('1 steps');
  });

  test('includes elementInfo for every step', () => {
    expect(html).toContain('button#login');
    expect(html).toContain('&#x27;Submit&#x27;');
  });

  test('embeds image src data URIs', () => {
    expect(html).toContain('data:image/jpeg;base64,/9j/abc123');
    expect(html).toContain('data:image/jpeg;base64,/9j/def456');
  });

  test('escapes HTML special characters in elementInfo (XSS prevention)', () => {
    const xssStep = [{ elementInfo: '<script>alert(1)</script>', image: 'data:image/jpeg;base64,x', timestamp: new Date().toISOString() }];
    const out = LocalGuide.buildHTMLString(xssStep);
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('includes @media print block for printer support', () => {
    expect(html).toContain('@media print');
    expect(html).toContain('page-break-after: always');
  });

  test('handles empty steps array without crashing', () => {
    const out = LocalGuide.buildHTMLString([]);
    expect(out).toContain('<!DOCTYPE html>');
    expect(out).toContain('0 steps');
  });

  test('numbers steps starting from 1', () => {
    expect(html).toContain('<div class="badge">1</div>');
    expect(html).toContain('<div class="badge">2</div>');
  });
});

// ── buildWordString ───────────────────────────────────────────────────────────

describe('buildWordString', () => {
  let doc;
  beforeAll(() => { doc = LocalGuide.buildWordString(MOCK_STEPS); });

  test('contains Word XML namespace declaration', () => {
    expect(doc).toContain('urn:schemas-microsoft-com:office:word');
  });

  test('includes elementInfo for every step', () => {
    expect(doc).toContain('button#login');
    expect(doc).toContain('&#x27;Submit&#x27;');
  });

  test('escapes HTML special characters in elementInfo', () => {
    const xssStep = [{ elementInfo: '<b>bold</b>', image: 'data:image/jpeg;base64,x', timestamp: new Date().toISOString() }];
    const out = LocalGuide.buildWordString(xssStep);
    expect(out).not.toContain('<b>bold</b>');
    expect(out).toContain('&lt;b&gt;bold&lt;/b&gt;');
  });

  test('first step has no page break', () => {
    expect(doc).toContain('page-break-before: auto');
  });

  test('second and subsequent steps have a page break', () => {
    expect(doc).toContain('page-break-before: always');
  });

  test('contains step count in meta line', () => {
    expect(doc).toContain('2 steps');
  });

  test('handles single step (no "always" page break)', () => {
    const single = LocalGuide.buildWordString([MOCK_STEPS[0]]);
    expect(single).not.toContain('page-break-before: always');
    expect(single).toContain('page-break-before: auto');
  });

  test('embeds image src data URIs', () => {
    expect(doc).toContain('data:image/jpeg;base64,/9j/abc123');
  });
});
