// @ts-ignore Missing type definitions for sbd
import { sentences as splitBySentences } from 'sbd';
import type { MarkdownElement } from '../types';
import { MarkdownElementType } from '../types';

/**
 * Chunk large markdown elements into smaller pieces
 * Uses sentence boundary detection for more natural chunks
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

    // Split the content into chunks using sentence boundaries
    const chunks = splitElementBySentences(elem, maxCharsPerElem);
    for (const chunk of chunks) {
      result.push(chunk);
    }
  }

  return result;
}

// Priority list of delimiters to try when splitting text
const delimitersByPriority = [
  '?',
  '!',
  '.',
  ';',
  ':',
  ',',
  '|',
  ' - ',
  ' ',
  '-',
];

/**
 * Split an element into chunks based on sentence boundaries
 */
function splitElementBySentences(
  elem: MarkdownElement,
  maxLength: number,
): MarkdownElement[] {
  // If the content is short enough, return it as is
  if (elem.content.length <= maxLength) {
    return [elem];
  }

  // Use sentence boundary detection to split the content
  const chunks = enforceMaxLength(elem.content, maxLength);

  // Create new elements from the chunks
  return chunks.map((content) => ({
    ...elem,
    content,
  }));
}

/**
 * Split text into chunks that respect sentence boundaries and maximum length
 */
function enforceMaxLength(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  // Split by sentences first
  return (
    splitBySentences(text)
      .flatMap((sentence: string) => {
        // If sentence is already short enough, keep it as is
        if (sentence.length <= maxLength) return sentence;

        // Otherwise, we need to split the sentence further
        const indices: [number, number][] = [];
        while ((indices.at(-1)?.[1] ?? 0) < sentence.length) {
          const prevIndex = indices.at(-1)?.[1] ?? 0;

          // If remaining text fits within maxLength
          if (prevIndex + maxLength >= sentence.length) {
            indices.push([prevIndex, sentence.length]);
            continue;
          }

          // Try to find a good delimiter to split on
          const bestDelimiter = delimitersByPriority.find(
            (delimiter) =>
              sentence.lastIndexOf(delimiter, prevIndex + maxLength) !== -1,
          );

          // If no delimiter found, just cut at maxLength
          if (!bestDelimiter) {
            indices.push([prevIndex, prevIndex + maxLength]);
            continue;
          }

          // Split at the best delimiter
          const closestDelimiter = sentence.lastIndexOf(
            bestDelimiter,
            prevIndex + maxLength,
          );
          indices.push([
            prevIndex,
            Math.max(prevIndex + 1, closestDelimiter + 1),
          ]); // Include the delimiter
        }

        return indices.map((sliceIndices) => sentence.slice(...sliceIndices));
      })
      // Merge small chunks back together if they fit
      .reduce<string[]>(
        (accumulator: string[], currentSentence: string) => {
          const lastChunk = accumulator[accumulator.length - 1];

          if (
            lastChunk &&
            lastChunk.length + currentSentence.length <= maxLength
          ) {
            // Create a new array to avoid modifying the accumulator directly
            const newAccumulator = accumulator.slice(0, -1);
            newAccumulator.push(lastChunk + currentSentence);
            return newAccumulator;
          }

          // Create a new array to avoid modifying the accumulator directly
          const newAccumulator = accumulator.slice();
          newAccumulator.push(currentSentence);
          return newAccumulator;
        },
        [''],
      )
      .filter(Boolean)
  ); // Remove empty chunks
}
