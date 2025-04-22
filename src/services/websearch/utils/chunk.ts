// @ts-ignore Missing type definitions for sbd
import { sentences as splitBySentences } from 'sbd';
import type { MarkdownElement } from '../types';
import { MarkdownElementType } from '../types';

/**
 * Chunk large markdown elements into smaller pieces
 * Uses sentence boundary detection for more natural chunks
 * Headers are included with their content for better context
 */
export function chunkElements(
  elements: MarkdownElement[],
  maxCharsPerElem: number,
): MarkdownElement[] {
  if (!maxCharsPerElem || maxCharsPerElem <= 0) return elements;

  return elements.flatMap((elem) => {
    // Skip chunking for lists and headers
    if (
      elem.type === MarkdownElementType.UnorderedListItem ||
      elem.type === MarkdownElementType.OrderedListItem ||
      elem.type === MarkdownElementType.Header
    ) {
      return [elem] as MarkdownElement[];
    }

    // Only chunk regular paragraphs and other content
    const contentChunks = splitIntoChunks(elem.content, maxCharsPerElem);
    return contentChunks.map((chunk) => ({
      ...elem,
      content: chunk,
      parent: elem.parent,
    })) as MarkdownElement[];
  });
}

function splitIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const sentences = splitBySentences(text);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const potentialChunk = currentChunk
      ? `${currentChunk} ${sentence}`
      : sentence;

    if (potentialChunk.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        // If a single sentence is too long, split it
        const parts = splitLongSentence(sentence, maxLength);
        chunks.push(...parts.slice(0, -1));
        currentChunk = parts[parts.length - 1];
      }
    } else {
      currentChunk = potentialChunk;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function splitLongSentence(sentence: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = sentence;

  while (remaining.length > maxLength) {
    // Try to find a good split point
    let splitPoint = remaining.lastIndexOf(' ', maxLength);
    if (splitPoint === -1) {
      splitPoint = maxLength;
    }

    chunks.push(remaining.slice(0, splitPoint).trim());
    remaining = remaining.slice(splitPoint).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}
