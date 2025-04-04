import type { MarkdownElement } from '../types';
import { MarkdownElementType } from '../types';

/**
 * Chunk large markdown elements into smaller pieces
 */
export function chunkElements(
  elements: MarkdownElement[],
  maxCharsPerElem: number,
): MarkdownElement[] {
  if (!maxCharsPerElem || maxCharsPerElem <= 0) return elements;

  const result: MarkdownElement[] = [];

  for (const elem of elements) {
    if (elem.content.length <= maxCharsPerElem) {
      result.push(elem);
      continue;
    }

    // If it's a header, we don't want to split it
    if (elem.type === MarkdownElementType.Header) {
      result.push({
        ...elem,
        content: elem.content.substring(0, maxCharsPerElem),
      });
      continue;
    }

    // Split the content into chunks
    const words = elem.content.split(' ');
    let currentChunk = '';

    for (const word of words) {
      if (currentChunk.length + word.length + 1 <= maxCharsPerElem) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk) {
          result.push({
            ...elem,
            content: currentChunk,
          });
        }
        currentChunk = word;
      }
    }

    if (currentChunk) {
      result.push({
        ...elem,
        content: currentChunk,
      });
    }
  }

  return result;
}
