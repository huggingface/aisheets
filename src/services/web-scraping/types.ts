/**
 * Types for the web scraping functionality
 */

/**
 * HTML Element representation
 */
export interface SerializedHTMLElement {
  tagName: string;
  attributes: Record<string, string>;
  content: (string | SerializedHTMLElement)[];
}

/**
 * Types for Markdown parsing
 */
export enum MarkdownElementType {
  Header = 'header',
  Paragraph = 'paragraph',
  UnorderedList = 'unordered-list',
  OrderedList = 'ordered-list',
  UnorderedListItem = 'unordered-list-item',
  OrderedListItem = 'ordered-list-item',
  BlockQuote = 'block-quote',
  CodeBlock = 'code-block',
  Code = 'code',
  Link = 'link',
  Image = 'image',
  Table = 'table',
}

/**
 * Map HTML tag names to Markdown element types
 */
export const tagNameMap: Record<string, MarkdownElementType> = {
  h1: MarkdownElementType.Header,
  h2: MarkdownElementType.Header,
  h3: MarkdownElementType.Header,
  h4: MarkdownElementType.Header,
  h5: MarkdownElementType.Header,
  h6: MarkdownElementType.Header,
  p: MarkdownElementType.Paragraph,
  ul: MarkdownElementType.UnorderedList,
  ol: MarkdownElementType.OrderedList,
  blockquote: MarkdownElementType.BlockQuote,
  pre: MarkdownElementType.CodeBlock,
  code: MarkdownElementType.Code,
  img: MarkdownElementType.Image,
  a: MarkdownElementType.Link,
  table: MarkdownElementType.Table,
};

/**
 * Base markdown element interface
 */
export interface BaseMarkdownElement {
  type: MarkdownElementType;
  content: string;
  parent: HeaderElement | null;
}

/**
 * Header element with children
 */
export interface HeaderElement extends BaseMarkdownElement {
  type: MarkdownElementType.Header;
  level: number;
  children: MarkdownElement[];
}

/**
 * List item element with depth
 */
export interface ListItemElement extends BaseMarkdownElement {
  type:
    | MarkdownElementType.UnorderedListItem
    | MarkdownElementType.OrderedListItem;
  depth: number;
}

/**
 * Block quote element with depth
 */
export interface BlockQuoteElement extends BaseMarkdownElement {
  type: MarkdownElementType.BlockQuote;
  depth: number;
}

/**
 * Union type of all markdown elements
 */
export type MarkdownElement =
  | HeaderElement
  | ListItemElement
  | BlockQuoteElement
  | (BaseMarkdownElement & {
      type: Exclude<
        MarkdownElementType,
        | MarkdownElementType.Header
        | MarkdownElementType.UnorderedListItem
        | MarkdownElementType.OrderedListItem
        | MarkdownElementType.BlockQuote
      >;
    });

/**
 * Conversion state for HTML to Markdown
 */
export interface ConversionState {
  defaultType:
    | MarkdownElementType.Paragraph
    | MarkdownElementType.BlockQuote
    | MarkdownElementType.UnorderedListItem
    | MarkdownElementType.OrderedListItem;
  listDepth: number;
  blockQuoteDepth: number;
}

/**
 * Result of a webpage scrape
 */
export interface ScrapedPage {
  title: string;
  content: string;
  markdownTree?: HeaderElement;
}

/**
 * Search result type imported from serper-search
 */
export interface SearchResult {
  title: string;
  link?: string;
  snippet: string;
}

/**
 * Search result with scraped content
 */
export interface EnrichedSearchResult extends SearchResult {
  scraped?: ScrapedPage;
}
