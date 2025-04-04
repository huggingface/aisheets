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
 * Markdown element types
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
 * HTML tag to markdown element mapping
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
 * Base markdown element
 */
export interface BaseMarkdownElement {
  type: MarkdownElementType;
  content: string;
  parent: HeaderElement | null;
}

/**
 * Header element
 */
export interface HeaderElement extends BaseMarkdownElement {
  type: MarkdownElementType.Header;
  level: number;
  children: MarkdownElement[];
}

/**
 * List item element
 */
export interface ListItemElement extends BaseMarkdownElement {
  type:
    | MarkdownElementType.UnorderedListItem
    | MarkdownElementType.OrderedListItem;
  depth: number;
}

/**
 * Block quote element
 */
export interface BlockQuoteElement extends BaseMarkdownElement {
  type: MarkdownElementType.BlockQuote;
  depth: number;
}

/**
 * All markdown element types
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
 * HTML to Markdown conversion state
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
  siteName?: string;
  author?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  content: string;
  markdownTree?: HeaderElement;
}

/**
 * Search result from external source
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
