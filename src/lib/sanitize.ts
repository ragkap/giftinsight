import 'server-only';
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInsightHtml(html: string | null): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a',
      'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4',
      'blockquote', 'pre', 'code',
      'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'hr',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'colspan', 'rowspan'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|\/)/i,
  });
}
