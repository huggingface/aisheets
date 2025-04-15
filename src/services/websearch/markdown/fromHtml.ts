import type {
  ConversionState,
  HeaderElement,
  MarkdownElement,
  SerializedHTMLElement,
} from '../types';
import { MarkdownElementType, tagNameMap } from '../types';

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
  const state: ConversionState = { ...prevState };

  if (elem.tagName === 'li') {
    const listContent = elem.content
      .flatMap((child) => htmlElementToMarkdownElements(parent, child, state))
      .map((result) => {
        if (typeof result === 'string') return result;
        return result.content;
      })
      .join('');

    return {
      parent,
      type: state.defaultType,
      content: listContent.trim(),
      depth: state.listDepth,
    };
  }

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

  return elem.content.flatMap((el) =>
    htmlElementToMarkdownElements(parent, el, state),
  );
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
