import { marked } from 'marked';

// Configure marked to output clean HTML
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Converts markdown text to HTML
 * @param {string} text - The markdown text to convert
 * @returns {string} - The HTML string
 */
export function parseMarkdown(text) {
  if (!text) return '';
  return marked(text);
}

/**
 * Converts markdown text to plain text with preserved structure
 * @param {string} text - The markdown text to convert
 * @returns {string} - The plain text string
 */
export function markdownToPlainText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold **text**
    .replace(/\*(.+?)\*/g, '$1') // Remove italic *text*
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links [text](url)
    .replace(/`(.+?)`/g, '$1') // Remove inline code `code`
    .replace(/^#+\s+/gm, ''); // Remove headers
}
