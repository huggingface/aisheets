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

  const result: MarkdownElement[] = [];
  let currentHeader: MarkdownElement | null = null;
  let currentContent = '';
  let isList = false;
  let isTable = false;
  let tableRows: string[] = [];

  for (const elem of elements) {
    if (elem.type === MarkdownElementType.Header) {
      // If we have accumulated content, create a chunk with the current header
      if (currentContent || tableRows.length > 0) {
        const content = isTable ? formatTable(tableRows) : currentContent;

        const chunks = splitElementBySentences(
          {
            type: MarkdownElementType.Paragraph,
            content: `${currentHeader ? currentHeader.content + (isList ? '\n\n' : '\n') : ''}${content}`,
            parent: null,
          },
          maxCharsPerElem,
        );
        result.push(...chunks);
        currentContent = '';
        tableRows = [];
        isList = false;
        isTable = false;
      }
      currentHeader = elem;
      continue;
    }

    // Check if this is a list item
    if (
      elem.type === MarkdownElementType.UnorderedListItem ||
      elem.type === MarkdownElementType.OrderedListItem
    ) {
      isList = true;
    }

    // Check if this is a table row
    if (elem.type === MarkdownElementType.TableRow) {
      isTable = true;
      tableRows.push(elem.content);
      continue;
    }

    // If we're in a table and encounter a non-table element, finalize the table
    if (isTable && elem.type !== MarkdownElementType.TableRow) {
      const formattedTable = formatTable(tableRows);
      const newContent = currentContent
        ? currentContent + '\n\n' + formattedTable
        : formattedTable;

      if (newContent.length > maxCharsPerElem) {
        if (currentContent) {
          const chunks = splitElementBySentences(
            {
              type: MarkdownElementType.Paragraph,
              content: `${currentHeader ? currentHeader.content + (isList ? '\n\n' : '\n') : ''}${currentContent}`,
              parent: null,
            },
            maxCharsPerElem,
          );
          result.push(...chunks);
          currentContent = formattedTable;
        } else {
          const chunks = splitElementBySentences(
            {
              type: MarkdownElementType.Paragraph,
              content: `${currentHeader ? currentHeader.content + (isList ? '\n\n' : '\n') : ''}${formattedTable}`,
              parent: null,
            },
            maxCharsPerElem,
          );
          result.push(...chunks);
        }
        tableRows = [];
        isTable = false;
      } else {
        currentContent = newContent;
        tableRows = [];
        isTable = false;
      }
    }

    // Add content to the current chunk, preserving formatting
    const newContent = currentContent
      ? currentContent + '\n' + elem.content
      : elem.content;

    // If the content is too long, split it
    if (newContent.length > maxCharsPerElem) {
      if (currentContent) {
        const chunks = splitElementBySentences(
          {
            type: MarkdownElementType.Paragraph,
            content: `${currentHeader ? currentHeader.content + (isList ? '\n\n' : '\n') : ''}${currentContent}`,
            parent: null,
          },
          maxCharsPerElem,
        );
        result.push(...chunks);
        currentContent = elem.content;
        isList =
          elem.type === MarkdownElementType.UnorderedListItem ||
          elem.type === MarkdownElementType.OrderedListItem;
      } else {
        const chunks = splitElementBySentences(
          {
            type: MarkdownElementType.Paragraph,
            content: `${currentHeader ? currentHeader.content + (isList ? '\n\n' : '\n') : ''}${elem.content}`,
            parent: null,
          },
          maxCharsPerElem,
        );
        result.push(...chunks);
        currentContent = '';
        isList = false;
      }
    } else {
      currentContent = newContent;
    }
  }

  // Don't forget the last chunk
  if (currentContent || tableRows.length > 0) {
    const content = isTable ? formatTable(tableRows) : currentContent;

    const chunks = splitElementBySentences(
      {
        type: MarkdownElementType.Paragraph,
        content: `${currentHeader ? currentHeader.content + (isList ? '\n\n' : '\n') : ''}${content}`,
        parent: null,
      },
      maxCharsPerElem,
    );
    result.push(...chunks);
  }

  return result;
}

/**
 * Format table rows into a nicely formatted markdown table
 */
function formatTable(rows: string[]): string {
  if (rows.length === 0) return '';

  // Split each row into cells
  const tableData = rows.map((row) =>
    row.split('|').map((cell) => cell.trim()),
  );

  // Calculate max width for each column
  const colWidths = tableData[0].map((_, colIndex) =>
    Math.max(...tableData.map((row) => (row[colIndex] || '').length)),
  );

  // Create separator row
  const separator = colWidths.map((width) => '-'.repeat(width + 2)).join('|');

  // Format each row
  const formattedRows = tableData.map((row) =>
    row
      .map((cell, i) => {
        const padding = ' '.repeat(colWidths[i] - cell.length);
        return ` ${cell}${padding} `;
      })
      .join('|'),
  );

  // Combine all rows with separator
  return formattedRows.join('\n' + separator + '\n');
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

  // Extract header if present
  const headerMatch = elem.content.match(/^([^\n]+)\n/);
  const header = headerMatch ? headerMatch[1] : '';
  const content = headerMatch
    ? elem.content.slice(headerMatch[0].length)
    : elem.content;

  // Use sentence boundary detection to split the content
  const chunks = enforceMaxLength(
    content,
    maxLength - (header ? header.length + 1 : 0),
  );

  // Create new elements from the chunks, preserving header in each chunk
  return chunks.map((chunkContent) => ({
    type: MarkdownElementType.Paragraph,
    content: header ? `${header}\n${chunkContent}` : chunkContent,
    parent: null,
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

function chunkWithContext(
  elements: MarkdownElement[],
  maxCharsPerElem: number,
): MarkdownElement[] {
  let currentHeader: MarkdownElement | null = null;
  let currentContent = '';
  const result: MarkdownElement[] = [];

  for (const elem of elements) {
    if (elem.type === MarkdownElementType.Header) {
      // Store current chunk if exists
      if (currentContent) {
        result.push({
          type: MarkdownElementType.Paragraph,
          content: `${currentHeader ? currentHeader.content + '\n' : ''}${currentContent}`,
          parent: elem.parent,
        });
      }
      currentHeader = elem;
      currentContent = '';
    } else {
      currentContent += (currentContent ? '\n' : '') + elem.content;

      // Check if we need to chunk
      if (currentContent.length > maxCharsPerElem) {
        // Create chunk with header context
        const chunks = splitElementBySentences(
          {
            type: MarkdownElementType.Paragraph,
            content: `${currentHeader ? currentHeader.content + '\n' : ''}${currentContent}`,
            parent: elem.parent,
          },
          maxCharsPerElem,
        );
        result.push(...chunks);
        currentContent = '';
      }
    }
  }

  // Don't forget the last chunk
  if (currentContent) {
    result.push({
      type: MarkdownElementType.Paragraph,
      content: `${currentHeader ? currentHeader.content + '\n' : ''}${currentContent}`,
      parent: null,
    });
  }

  return result;
}
