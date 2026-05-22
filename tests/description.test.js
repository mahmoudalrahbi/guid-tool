const { describeStep } = require('../src/description.js');

describe('describeStep', () => {
  test('prefers aria-label over all other fields', () => {
    const result = describeStep({
      ariaLabel: 'Open menu',
      text: 'Menu',
      placeholder: 'Search',
      title: 'tooltip',
      role: 'button',
      tagName: 'BUTTON',
    });
    expect(result).toBe('Click "Open menu"');
  });

  test('uses visible text when aria-label is missing', () => {
    const result = describeStep({
      text: 'Sign in',
      placeholder: 'Search',
      tagName: 'BUTTON',
    });
    expect(result).toBe('Click "Sign in"');
  });

  test('uses placeholder when aria-label and text are missing', () => {
    const result = describeStep({
      placeholder: 'Search for anything',
      tagName: 'INPUT',
    });
    expect(result).toBe('Click "Search for anything"');
  });

  test('uses title when only title is present besides tag', () => {
    const result = describeStep({
      title: 'Settings',
      tagName: 'A',
    });
    expect(result).toBe('Click "Settings"');
  });

  test('falls back to role + tag when no labels are present', () => {
    const result = describeStep({
      role: 'button',
      tagName: 'DIV',
    });
    expect(result).toBe('Click button');
  });

  test('falls back to lowercased tag name when only tag is present', () => {
    const result = describeStep({ tagName: 'A' });
    expect(result).toBe('Click a');
  });

  test('returns empty string when nothing is provided', () => {
    expect(describeStep({})).toBe('');
  });

  test('trims and collapses whitespace in label text', () => {
    const result = describeStep({ text: '  Sign\n  in  ' });
    expect(result).toBe('Click "Sign in"');
  });

  test('truncates very long label text', () => {
    const longText = 'a'.repeat(120);
    const result = describeStep({ text: longText });
    expect(result.length).toBeLessThanOrEqual('Click ""'.length + 80 + 1);
    expect(result.startsWith('Click "')).toBe(true);
    expect(result.endsWith('…"')).toBe(true);
  });

  test('handles null metadata gracefully', () => {
    expect(describeStep(null)).toBe('');
    expect(describeStep(undefined)).toBe('');
  });
});
