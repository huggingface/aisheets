import type { MarkdownElement } from '../types';

/**
 * Flatten a markdown tree into a list of elements
 * This makes it easier to process elements for embedding
 */
export function flattenTree(elem: MarkdownElement): MarkdownElement[] {
  if ('children' in elem) {
    // For header elements that have children, include the header itself
    // and all children (recursively flattened)
    return [elem, ...elem.children.flatMap(flattenTree)];
  }

  // For leaf elements, just return the element itself
  return [elem];
}
