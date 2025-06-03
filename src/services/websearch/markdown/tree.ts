import type {
  BlockQuoteElement,
  HeaderElement,
  ListItemElement,
  MarkdownElement,
  SerializedHTMLElement,
} from '../types';
import { MarkdownElementType } from '../types';
import { chunkElements } from '../utils/chunk';
import {
  htmlElementToMarkdownElements,
  mergeAdjacentElements,
} from './fromHtml';
import { stringifyMarkdownElement } from './utils/stringify';

/**
 * Converts HTML elements to Markdown elements and creates a tree based on header tags
 */
export function htmlToMarkdownTree(
  title: string,
  htmlElements: SerializedHTMLElement[],
  maxCharsPerElem: number,
): HeaderElement {
  const root: HeaderElement = {
    type: MarkdownElementType.Header,
    level: 1,
    parent: null,
    content: title,
    children: [],
  };

  const markdownElements = chunkElements(
    mergeAdjacentElements(
      htmlElements.flatMap((elem) => htmlElementToMarkdownElements(root, elem)),
    ),
    maxCharsPerElem,
  );

  let currentHeader = root;
  let currentContent: MarkdownElement[] = [];

  for (const elem of markdownElements) {
    if (elem.type === MarkdownElementType.Header) {
      // When we hit a header, attach accumulated content to current header
      if (currentContent.length > 0) {
        currentHeader.children.push(...currentContent);
        currentContent = [];
      }

      const headerElem = elem as HeaderElement;
      headerElem.parent = root;
      root.children.push(headerElem);
      currentHeader = headerElem;
    } else {
      // Attach content to current header
      elem.parent = currentHeader;
      currentContent.push(elem);
    }
  }

  // Don't forget remaining content
  if (currentContent.length > 0) {
    currentHeader.children.push(...currentContent);
  }

  return root;
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
        const listItem = element as ListItemElement;
        return `${'  '.repeat(listItem.depth - 1)}- ${element.content}\n`;
      }
      case MarkdownElementType.OrderedListItem: {
        const listItem = element as ListItemElement;
        return `${'  '.repeat(listItem.depth - 1)}1. ${element.content}\n`;
      }
      case MarkdownElementType.BlockQuote: {
        const blockQuote = element as BlockQuoteElement;
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
    // For header elements, only prepend their text to certain element types
    const headerText =
      elem.type === MarkdownElementType.Header ? `${elem.content}\n\n` : '';

    // Process children and selectively prepend header text
    return (elem as HeaderElement).children.flatMap((child) => {
      const flattenedChildren = flattenTree(child);

      // Group consecutive list items together
      const groupedChildren: MarkdownElement[] = [];
      let currentListItems: MarkdownElement[] = [];
      let currentListType: MarkdownElementType | null = null;

      for (const childElem of flattenedChildren) {
        const isListItem =
          childElem.type === MarkdownElementType.UnorderedListItem ||
          childElem.type === MarkdownElementType.OrderedListItem;

        if (isListItem) {
          // If this is a different list type than what we're collecting, flush current list
          if (currentListType && childElem.type !== currentListType) {
            if (currentListItems.length > 0) {
              groupedChildren.push({
                type: currentListType,
                content: currentListItems
                  .map((item) => item.content)
                  .join('\n'),
                parent: elem.parent,
                depth: (currentListItems[0] as ListItemElement).depth,
              });
              currentListItems = [];
            }
          }

          // Start or continue collecting list items
          currentListType = childElem.type;
          currentListItems.push(childElem);
        } else {
          // If we were collecting a list, flush it first
          if (currentListItems.length > 0) {
            groupedChildren.push({
              type: currentListType!,
              content: currentListItems.map((item) => item.content).join('\n'),
              parent: elem.parent,
              depth: (currentListItems[0] as ListItemElement).depth,
            });
            currentListItems = [];
            currentListType = null;
          }

          // Add non-list element
          groupedChildren.push(childElem);
        }
      }

      // Don't forget to flush any remaining list items
      if (currentListItems.length > 0) {
        groupedChildren.push({
          type: currentListType!,
          content: currentListItems.map((item) => item.content).join('\n'),
          parent: elem.parent,
          depth: (currentListItems[0] as ListItemElement).depth,
        });
      }

      // Now apply header inheritance to the grouped elements
      return groupedChildren.map((childElem) => {
        // Only prepend header text to certain element types
        const shouldInheritHeader =
          childElem.type === MarkdownElementType.Paragraph ||
          childElem.type === MarkdownElementType.CodeBlock ||
          childElem.type === MarkdownElementType.Table ||
          childElem.type === MarkdownElementType.UnorderedList ||
          childElem.type === MarkdownElementType.OrderedList;

        return {
          ...childElem,
          content: shouldInheritHeader
            ? headerText + childElem.content
            : childElem.content,
        };
      });
    });
  }

  // For leaf elements, just return the element itself
  return [elem];
}

/**
 * Groups list items together and returns chunks of text
 * Preserves proper ordering for ordered lists by stringifying them together
 */
export function groupListItemsIntoChunks(
  elements: MarkdownElement[],
): string[] {
  const chunks: string[] = [];
  let currentListItems: MarkdownElement[] = [];
  let isUnorderedList = false;

  for (const element of elements) {
    // If it's a list item
    if (
      element.type === MarkdownElementType.UnorderedListItem ||
      element.type === MarkdownElementType.OrderedListItem
    ) {
      const isCurrentUnordered =
        element.type === MarkdownElementType.UnorderedListItem;
      if (
        currentListItems.length > 0 &&
        isCurrentUnordered !== isUnorderedList
      ) {
        // Stringify the entire list at once to maintain proper ordering
        chunks.push(currentListItems.map(stringifyMarkdownElement).join(''));
        currentListItems = [];
      }

      isUnorderedList = isCurrentUnordered;
      currentListItems.push(element);
    } else {
      if (currentListItems.length > 0) {
        chunks.push(currentListItems.map(stringifyMarkdownElement).join(''));
        currentListItems = [];
      }
      chunks.push(stringifyMarkdownElement(element));
    }
  }

  if (currentListItems.length > 0) {
    chunks.push(currentListItems.map(stringifyMarkdownElement).join(''));
  }

  return chunks;
}
