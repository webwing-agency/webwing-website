function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyInlineFormatting(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^\*])\*(?!\s)(.+?)(?<!\s)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_(?!\s)(.+?)(?<!\s)_/g, '$1<em>$2</em>');
}

export function richTextToHtml(value) {
  if (!value) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  const paragraphs = raw
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return paragraphs
    .map((block) => {
      const escaped = escapeHtml(block).replace(/\n/g, '<br>');
      return `<p>${applyInlineFormatting(escaped)}</p>`;
    })
    .join('');
}
