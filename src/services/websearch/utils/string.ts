import type { SerializedHTMLElement } from '../types';

/**
 * Collapse multiple whitespace into a single space
 */
export function collapseString(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Sanitize string for code blocks
 */
export function sanitizeString(str: string): string {
  return str.trim();
}

/**
 * Stringify HTML elements with formatting
 */
export function stringifyHTMLElements(
  elements: (string | SerializedHTMLElement)[],
): string {
  return elements
    .map((element) => {
      if (typeof element === 'string') return element;
      return stringifyHTMLElements(element.content);
    })
    .join(' ')
    .trim();
}

/**
 * Stringify HTML elements without formatting
 */
export function stringifyHTMLElementsUnformatted(
  elements: (string | SerializedHTMLElement)[],
): string {
  return elements
    .map((element) => {
      if (typeof element === 'string') return element;
      return stringifyHTMLElementsUnformatted(element.content);
    })
    .join('')
    .trim();
}
