import consola from 'consola';
import { htmlToMarkdownTree } from '../markdown/tree';
import { markdownTreeToString } from '../markdown/tree';
import type { ScrapedPage } from '../types';
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
const DEFAULT_MAX_CHARS_PER_ELEMENT = 5000;

/**
 * Maximum total characters for a page
 */
const MAX_TOTAL_CONTENT_LENGTH = 25000;

/**
 * Maximum number of concurrent scraping operations
 */
const MAX_CONCURRENT_SCRAPES = 5;

// Register cleanup handler
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

      const contentType = response.headers()['content-type'] || '';
      let content = '';
      let title = '';
      let markdownTree = null;

      // Initialize with default empty values
      let pageData: ReturnType<typeof spatialParser> = {
        title: '',
        elements: [],
        metrics: {
          clusterCount: 0,
        },
      };

      title = await page.title();

      if (
        contentType.includes('text/plain') ||
        contentType.includes('text/markdown') ||
        contentType.includes('application/json') ||
        contentType.includes('application/xml') ||
        contentType.includes('text/csv')
      ) {
        // For plain text content types
        content = await page.content();
        markdownTree = htmlToMarkdownTree(
          title,
          [{ tagName: 'p', attributes: {}, content: [content] }],
          maxCharsPerElem,
        );
        content = markdownTreeToString(markdownTree);
      } else {
        // For HTML content
        try {
          await page.waitForLoadState('networkidle', { timeout: 500 });
        } catch (e) {
          // Continue with what we have
        }

        try {
          pageData = await timeout(page.evaluate(spatialParser), 2000);
          markdownTree = htmlToMarkdownTree(
            pageData.title || title,
            pageData.elements,
            maxCharsPerElem,
          );
          content = markdownTreeToString(markdownTree);
        } catch (e: unknown) {
          const error = e instanceof Error ? e : new Error(String(e));
          logger.error(`Error running spatial parser: ${error.message}`);

          // Fallback to basic content extraction
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
        title: pageData.title || title,
        siteName: pageData.siteName,
        author: pageData.author,
        description: pageData.description,
        createdAt: pageData.createdAt,
        updatedAt: pageData.updatedAt,
        content,
        markdownTree,
      };
    });

    logger.success(
      `Scraped ${url}: ${result.content.length} chars in ${Date.now() - startTime}ms`,
    );
    return result;
  } catch (error) {
    logger.error(`Error scraping URL: ${url}`, error);
    return null;
  }
}

/**
 * Scrape multiple URLs in parallel with concurrency control
 */
export async function* scrapeUrlsBatch(
  urls: string[],
  maxConcurrent = MAX_CONCURRENT_SCRAPES,
) {
  logger.info(`Starting parallel scraping of ${urls.length} URLs`);

  // Process URLs in chunks to limit concurrency
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const chunk = urls.slice(i, i + maxConcurrent);
    logger.info(
      `Processing chunk ${i / maxConcurrent + 1}: ${chunk.length} URLs`,
    );

    const promises = chunk.map(async (url) => {
      try {
        const result = await scrapeUrl(url, DEFAULT_MAX_CHARS_PER_ELEMENT);
        return { url, result };
      } catch (error) {
        logger.error(`Failed to scrape ${url}:`, error);
        return { url, result: null };
      }
    });

    for (const promise of promises) {
      yield promise;
    }
  }
}
