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

  // First, group list items together
  const groupedElements: MarkdownElement[] = [];
  let currentListItems: MarkdownElement[] = [];
  let currentListType: MarkdownElementType | null = null;
  let currentHeader: string | null = null;

  for (const elem of elements) {
    // If this is a header, store it for the next list
    if (elem.type === MarkdownElementType.Header) {
      currentHeader = elem.content;
      groupedElements.push(elem);
      continue;
    }

    // If this is a list item
    if (
      elem.type === MarkdownElementType.UnorderedListItem ||
      elem.type === MarkdownElementType.OrderedListItem
    ) {
      // If we were collecting a different type of list, flush it
      if (currentListType && elem.type !== currentListType) {
        if (currentListItems.length > 0) {
          groupedElements.push({
            type:
              currentListType === MarkdownElementType.UnorderedListItem
                ? MarkdownElementType.UnorderedList
                : MarkdownElementType.OrderedList,
            content: currentHeader
              ? `${currentHeader}\n\n${currentListItems.map((item) => item.content).join('\n')}`
              : currentListItems.map((item) => item.content).join('\n'),
            parent: elem.parent,
          });
          currentListItems = [];
          currentHeader = null;
        }
      }

      // Start or continue collecting list items
      currentListType = elem.type;
      currentListItems.push(elem);
    } else {
      // If we were collecting a list, flush it first
      if (currentListItems.length > 0) {
        groupedElements.push({
          type:
            currentListType === MarkdownElementType.UnorderedListItem
              ? MarkdownElementType.UnorderedList
              : MarkdownElementType.OrderedList,
          content: currentHeader
            ? `${currentHeader}\n\n${currentListItems.map((item) => item.content).join('\n')}`
            : currentListItems.map((item) => item.content).join('\n'),
          parent: elem.parent,
        });
        currentListItems = [];
        currentHeader = null;
      }

      // Add non-list element
      groupedElements.push(elem);
    }
  }

  // Don't forget to flush any remaining list items
  if (currentListItems.length > 0) {
    groupedElements.push({
      type:
        currentListType === MarkdownElementType.UnorderedListItem
          ? MarkdownElementType.UnorderedList
          : MarkdownElementType.OrderedList,
      content: currentHeader
        ? `${currentHeader}\n\n${currentListItems.map((item) => item.content).join('\n')}`
        : currentListItems.map((item) => item.content).join('\n'),
      parent: currentListItems[0].parent,
    });
  }

  // Now chunk the grouped elements
  return groupedElements.flatMap((elem) => {
    // Skip chunking for lists and headers
    if (
      elem.type === MarkdownElementType.UnorderedList ||
      elem.type === MarkdownElementType.OrderedList ||
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
