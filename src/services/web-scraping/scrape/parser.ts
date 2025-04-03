import type { SerializedHTMLElement } from '../types';

/**
 * A basic spatial parser for extracting HTML structure from pages
 * This is a simplified version of what HuggingFace might be using
 */
export function spatialParser(): {
  title: string;
  elements: SerializedHTMLElement[];
} {
  function serializeElement(
    element: HTMLElement,
  ): SerializedHTMLElement | null {
    // Skip invisible elements
    if (
      element.offsetWidth === 0 &&
      element.offsetHeight === 0 &&
      !element.getClientRects().length
    ) {
      return null;
    }

    // Skip elements typically not containing main content
    const tagName = element.tagName.toLowerCase();
    if (
      tagName === 'script' ||
      tagName === 'style' ||
      tagName === 'noscript' ||
      tagName === 'iframe' ||
      tagName === 'svg' ||
      tagName === 'path' ||
      element.id?.includes('nav') ||
      element.id?.includes('menu') ||
      element.id?.includes('header') ||
      element.id?.includes('footer') ||
      element.className?.includes('nav') ||
      element.className?.includes('menu') ||
      element.className?.includes('header') ||
      element.className?.includes('footer')
    ) {
      return null;
    }

    // Get attributes
    const attributes: Record<string, string> = {};
    for (const attr of Array.from(element.attributes)) {
      attributes[attr.name] = attr.value;
    }

    // Get content (text and child elements)
    const childNodes = Array.from(element.childNodes);
    const content: (string | SerializedHTMLElement)[] = [];

    for (const child of childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = (child as Text).textContent?.trim() || '';
        if (text) {
          content.push(text);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const serialized = serializeElement(child as HTMLElement);
        if (serialized) {
          content.push(serialized);
        }
      }
    }

    return {
      tagName,
      attributes,
      content,
    };
  }

  // Try to find main content elements
  const mainSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.article',
    '.post',
    '#content',
    '#main',
  ];

  let mainElement: HTMLElement | null = null;
  for (const selector of mainSelectors) {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (element) {
      mainElement = element;
      break;
    }
  }

  // If no main element found, use body
  const rootElement = mainElement || document.body;

  // Serialize the elements
  const elements: SerializedHTMLElement[] = [];
  for (const child of Array.from(rootElement.children)) {
    const serialized = serializeElement(child as HTMLElement);
    if (serialized) {
      elements.push(serialized);
    }
  }

  return {
    title: document.title,
    elements,
  };
}
