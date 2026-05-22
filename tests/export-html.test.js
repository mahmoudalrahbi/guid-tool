const { exportHtml } = require('../src/export-html.js');

function makeJpegBlob(label) {
  const bytes = new TextEncoder().encode(label || 'jpeg');
  return new Blob([bytes], { type: 'image/jpeg' });
}

async function asText(blob) {
  return blob.text ? blob.text() : new Response(blob).text();
}

describe('exportHtml', () => {
  test('returns a text/html Blob', async () => {
    const result = await exportHtml({
      title: 'Test Guide',
      description: '',
      steps: [],
    });
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('text/html');
  });

  test('embeds the guide title in the document', async () => {
    const result = await exportHtml({
      title: 'How to deploy',
      description: '',
      steps: [],
    });
    const html = await asText(result);
    expect(html).toContain('How to deploy');
    expect(html).toMatch(/<!DOCTYPE html>/i);
  });

  test('embeds each step description in document order', async () => {
    const result = await exportHtml({
      title: 'Two steps',
      description: '',
      steps: [
        { description: 'Click "Sign in"', screenshotBlob: makeJpegBlob('a') },
        { description: 'Click "Submit"', screenshotBlob: makeJpegBlob('b') },
      ],
    });
    const html = await asText(result);
    const idxSignIn = html.indexOf('Click &quot;Sign in&quot;');
    const idxSubmit = html.indexOf('Click &quot;Submit&quot;');
    expect(idxSignIn).toBeGreaterThan(-1);
    expect(idxSubmit).toBeGreaterThan(idxSignIn);
  });

  test('embeds each screenshot as a data:image/jpeg;base64 URI', async () => {
    const result = await exportHtml({
      title: 'With screenshots',
      description: '',
      steps: [
        { description: 'Step 1', screenshotBlob: makeJpegBlob('hello') },
      ],
    });
    const html = await asText(result);
    expect(html).toMatch(/<img[^>]+src="data:image\/jpeg;base64,[A-Za-z0-9+/=]+"/);
  });

  test('escapes HTML in user-supplied text to prevent XSS', async () => {
    const result = await exportHtml({
      title: '<script>alert(1)</script>',
      description: '',
      steps: [
        { description: '<img src=x onerror=alert(1)>', screenshotBlob: makeJpegBlob('x') },
      ],
    });
    const html = await asText(result);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  test('renders numbered step labels', async () => {
    const result = await exportHtml({
      title: 'T',
      description: '',
      steps: [
        { description: 'a', screenshotBlob: makeJpegBlob('a') },
        { description: 'b', screenshotBlob: makeJpegBlob('b') },
      ],
    });
    const html = await asText(result);
    expect(html).toContain('Step 1');
    expect(html).toContain('Step 2');
  });

  test('renders a placeholder when a step has no description', async () => {
    const result = await exportHtml({
      title: 'T',
      description: '',
      steps: [{ description: '', screenshotBlob: makeJpegBlob('x') }],
    });
    const html = await asText(result);
    expect(html).toContain('Describe this Step');
  });
});
