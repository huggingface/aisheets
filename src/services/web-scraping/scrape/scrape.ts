import consola from 'consola';
import { htmlToMarkdownTree } from '../markdown/tree';
import { markdownTreeToString } from '../markdown/tree';
import type { ScrapedPage, SerializedHTMLElement } from '../types';
import { timeout } from '../utils/timeout';
import { spatialParser } from './parser';
import { closeBrowser, withPage } from './playwright';

/**
 * Logger for the scrape module
 */
const logger = consola.withTag('scrape');

/**
 * Default maximum number of characters per element
 */
const DEFAULT_MAX_CHARS_PER_ELEMENT = 1000;

/**
 * Maximum total characters for a page
 */
const MAX_TOTAL_CONTENT_LENGTH = 25000;

// Add a cleanup handler for application shutdown
process.on('exit', () => {
  closeBrowser().catch(() => {});
});

/**
 * Scrape a URL to extract content
 */
export async function scrapeUrl(
  url: string,
  maxCharsPerElem = DEFAULT_MAX_CHARS_PER_ELEMENT,
): Promise<ScrapedPage | null> {
  try {
    logger.info(`Scraping URL: ${url}`);
    const startTime = Date.now();

    const result = await withPage(url, async (page, response) => {
      if (!response) {
        throw new Error('Failed to load page');
      }

      if (!response.ok()) {
        throw new Error(`Failed to load page: ${response.status()}`);
      }

      // Check content type to determine how to process
      const contentType = response.headers()['content-type'] || '';
      let content = '';
      let title = '';
      let markdownTree = null;
      let pageData = {
        title: '',
        elements: [] as SerializedHTMLElement[],
        siteName: undefined as string | undefined,
        author: undefined as string | undefined,
        description: undefined as string | undefined,
        createdAt: undefined as string | undefined,
        updatedAt: undefined as string | undefined,
      };

      // Get page title
      title = await page.title();

      if (
        contentType.includes('text/plain') ||
        contentType.includes('text/markdown') ||
        contentType.includes('application/json') ||
        contentType.includes('application/xml') ||
        contentType.includes('text/csv')
      ) {
        // For plain text content types, get the text directly
        content = await page.content();

        // Create a simple markdown tree for plain text
        markdownTree = htmlToMarkdownTree(
          title,
          [{ tagName: 'p', attributes: {}, content: [content] }],
          maxCharsPerElem,
        );

        // Convert markdown tree to string
        content = markdownTreeToString(markdownTree);
      } else {
        // For HTML, extract the main content
        // First, wait for any potential JavaScript to load
        try {
          await page.waitForLoadState('networkidle', { timeout: 5000 });
        } catch (e) {
          logger.warn(`Timeout waiting for network idle: ${url}`);
          // Continue with what we have
        }

        // Use the spatial parser to extract the content
        try {
          pageData = (await timeout(
            page.evaluate(spatialParser),
            10000,
          )) as ReturnType<typeof spatialParser>;

          // Create markdown tree from the scraped HTML elements
          markdownTree = htmlToMarkdownTree(
            pageData.title || title,
            pageData.elements,
            maxCharsPerElem,
          );

          // Convert markdown tree to string
          content = markdownTreeToString(markdownTree);
        } catch (e: unknown) {
          const error = e instanceof Error ? e : new Error(String(e));
          logger.error(`Error running spatial parser: ${error.message}`);
          // Create a basic content representation if spatial parser fails
          content = await page.content();
          markdownTree = htmlToMarkdownTree(
            title,
            [{ tagName: 'p', attributes: {}, content: [content] }],
            maxCharsPerElem,
          );
          content = markdownTreeToString(markdownTree);
        }
      }

      // Limit content length
      if (content.length > MAX_TOTAL_CONTENT_LENGTH) {
        content = content.substring(0, MAX_TOTAL_CONTENT_LENGTH) + '...';
      }

      return {
        title: pageData?.title || title,
        siteName: pageData?.siteName,
        author: pageData?.author,
        description: pageData?.description,
        createdAt: pageData?.createdAt,
        updatedAt: pageData?.updatedAt,
        content,
        markdownTree,
      };
    });

    logger.success(
      `Scraped URL: ${url} (${result.content.length} chars, took ${
        Date.now() - startTime
      }ms)`,
    );

    return result;
  } catch (error) {
    logger.error(`Error scraping URL: ${url}`, error);
    return null;
  }
}
