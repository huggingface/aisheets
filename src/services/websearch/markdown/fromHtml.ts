import type {
  ConversionState,
  HeaderElement,
  MarkdownElement,
  SerializedHTMLElement,
} from '../types';
import { MarkdownElementType, tagNameMap } from '../types';
import {
  collapseString,
  sanitizeString,
  stringifyHTMLElements,
  stringifyHTMLElementsUnformatted,
} from '../utils/string';

/**
 * Convert HTML element to Markdown elements
 */
export function htmlElementToMarkdownElements(
  parent: HeaderElement,
  elem: SerializedHTMLElement | string,
  prevState: ConversionState = {
    defaultType: MarkdownElementType.Paragraph,
    listDepth: 0,
    blockQuoteDepth: 0,
  },
): MarkdownElement | MarkdownElement[] {
  // Found text so create an element based on the previous state
  if (typeof elem === 'string') {
    if (elem.trim().length === 0) return [];

    if (
      prevState.defaultType === MarkdownElementType.UnorderedListItem ||
      prevState.defaultType === MarkdownElementType.OrderedListItem
    ) {
      return {
        parent,
        type: prevState.defaultType,
        content: elem,
        depth: prevState.listDepth,
      };
    }

    if (prevState.defaultType === MarkdownElementType.BlockQuote) {
      return {
        parent,
        type: prevState.defaultType,
        content: elem,
        depth: prevState.blockQuoteDepth,
      };
    }

    return {
      parent,
      type: prevState.defaultType,
      content: elem,
    };
  }

  const type = tagNameMap[elem.tagName] ?? MarkdownElementType.Paragraph;

  // Update the state based on the current element
  const state: ConversionState = { ...prevState };

  if (
    type === MarkdownElementType.UnorderedList ||
    type === MarkdownElementType.OrderedList
  ) {
    state.listDepth += 1;
    state.defaultType =
      type === MarkdownElementType.UnorderedList
        ? MarkdownElementType.UnorderedListItem
        : MarkdownElementType.OrderedListItem;
  }

  if (type === MarkdownElementType.BlockQuote) {
    state.defaultType = MarkdownElementType.BlockQuote;
    state.blockQuoteDepth += 1;
  }

  // Headers
  if (type === MarkdownElementType.Header) {
    return {
      parent,
      type,
      level: Number(elem.tagName[1]),
      content: collapseString(stringifyHTMLElements(elem.content)),
      children: [],
    };
  }

  // Code blocks
  if (type === MarkdownElementType.CodeBlock) {
    return {
      parent,
      type,
      content: sanitizeString(stringifyHTMLElementsUnformatted(elem.content)),
    };
  }

  // Special handling for list items to keep them together
  if (elem.tagName === 'li') {
    return {
      parent,
      type: state.defaultType,
      content: stringifyHTMLElementsUnformatted(elem.content),
      depth: state.listDepth,
    };
  }

  // Typical case, we want to flatten the DOM and only create elements when we see text
  const result = elem.content.flatMap((el) =>
    htmlElementToMarkdownElements(parent, el, state),
  );

  return result;
}

/**
 * Merge adjacent Markdown elements of the same type
 */
export function mergeAdjacentElements(
  elements: MarkdownElement[],
): MarkdownElement[] {
  return elements.reduce<MarkdownElement[]>((acc, elem) => {
    const last = acc[acc.length - 1];
    if (
      last &&
      last.type === MarkdownElementType.Paragraph &&
      last.type === elem.type
    ) {
      last.content += ' ' + elem.content;
      return acc;
    }
    acc.push(elem);
    return acc;
  }, []);
}
