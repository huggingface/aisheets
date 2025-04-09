import type {
  HeaderElement,
  MarkdownElement,
  SerializedHTMLElement,
} from '../types';
import { MarkdownElementType } from '../types';
import { chunkElements } from '../utils/chunk';
import {
  htmlElementToMarkdownElements,
  mergeAdjacentElements,
} from './fromHtml';

/**
 * Converts HTML elements to Markdown elements and creates a tree based on header tags
 */
export function htmlToMarkdownTree(
  title: string,
  htmlElements: SerializedHTMLElement[],
  maxCharsPerElem: number,
): HeaderElement {
  let parent: HeaderElement = {
    type: MarkdownElementType.Header,
    level: 1,
    parent: null,
    content: title,
    children: [],
  };

  const markdownElements = chunkElements(
    mergeAdjacentElements(
      htmlElements.flatMap((elem) =>
        htmlElementToMarkdownElements(parent, elem),
      ),
    ),
    maxCharsPerElem,
  );

  for (const elem of markdownElements) {
    if (elem.type !== MarkdownElementType.Header) {
      elem.parent = parent;
      parent.children.push(elem);
      continue;
    }

    // Add 1 to current level to offset for the title being level 1
    const headerElem = elem as HeaderElement;
    headerElem.level += 1;

    // Pop up header levels until reaching the same level as the current header
    // or until we reach the root
    let currentParent = parent;
    while (currentParent !== null && currentParent.parent !== null) {
      if (currentParent.level < headerElem.level) break;
      currentParent = currentParent.parent;
    }

    currentParent.children.push(headerElem);
    parent = headerElem;
  }

  // Pop up to the root
  while (parent.parent !== null) {
    parent = parent.parent;
  }

  return parent;
}

/**
 * Remove parent references for serialization
 */
export function removeParents<T extends MarkdownElement>(elem: T): T {
  if ('children' in elem) {
    return {
      ...elem,
      parent: null,
      children: (elem as HeaderElement).children.map((child) =>
        removeParents(child),
      ),
    } as T;
  }
  return { ...elem, parent: null } as T;
}

/**
 * Convert markdown tree to a flat markdown string
 */
export function markdownTreeToString(tree: HeaderElement): string {
  let result = `# ${tree.content}\n\n`;

  function processElement(element: MarkdownElement): string {
    switch (element.type) {
      case MarkdownElementType.Header:
        return (
          `${'#'.repeat(element.level)} ${element.content}\n\n` +
          element.children.map(processElement).join('')
        );
      case MarkdownElementType.Paragraph:
        return `${element.content}\n\n`;
      case MarkdownElementType.UnorderedListItem: {
        const listItem = element as unknown as { depth: number };
        return `${'  '.repeat(listItem.depth - 1)}- ${element.content}\n`;
      }
      case MarkdownElementType.OrderedListItem: {
        const listItem = element as unknown as { depth: number };
        return `${'  '.repeat(listItem.depth - 1)}1. ${element.content}\n`;
      }
      case MarkdownElementType.BlockQuote: {
        const blockQuote = element as unknown as { depth: number };
        return `${'> '.repeat(blockQuote.depth)}${element.content.replace(/\n/g, '\n' + '> '.repeat(blockQuote.depth))}\n\n`;
      }
      case MarkdownElementType.CodeBlock:
        return `\`\`\`\n${element.content}\n\`\`\`\n\n`;
      case MarkdownElementType.Code:
        return `\`${element.content}\``;
      case MarkdownElementType.Link: {
        // Extract href from content if available
        const hrefMatch = element.content.match(/href="([^"]+)"/);
        const href = hrefMatch ? hrefMatch[1] : '';
        const text = element.content.replace(/<[^>]+>/g, '').trim();
        return `[${text}](${href})`;
      }
      case MarkdownElementType.Image: {
        // Extract src and alt from content if available
        const srcMatch = element.content.match(/src="([^"]+)"/);
        const src = srcMatch ? srcMatch[1] : '';
        const altMatch = element.content.match(/alt="([^"]+)"/);
        const alt = altMatch ? altMatch[1] : '';
        return `![${alt}](${src})`;
      }
      case MarkdownElementType.Table:
        // Just preserve the table content as-is for now
        return `${element.content}\n\n`;
      default:
        return '';
    }
  }

  for (const child of tree.children) {
    result += processElement(child);
  }

  return result.trim();
}

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
