import consola from 'consola';
import type { SearchResult } from '../serper-search';
import { scrapeUrl } from './scrape/scrape';
import type { EnrichedSearchResult, ScrapedPage } from './types';

/**
 * Logger for the web scraper
 */
const logger = consola.withTag('web-scraper');

/**
 * WebScraper class for extracting content from URLs
 */
export class WebScraper {
  private maxCharsPerElement: number;

  /**
   * Create a new WebScraper instance
   *
   * @param maxCharsPerElement Maximum number of characters per element in the extracted content
   */
  constructor(maxCharsPerElement = 1000) {
    this.maxCharsPerElement = maxCharsPerElement;
  }

  /**
   * Scrape a URL using Playwright to get the content
   *
   * @param url URL to scrape
   * @returns ScrapedPage object with title, content, and markdownTree
   */
  async scrapeUrl(url: string): Promise<ScrapedPage | null> {
    try {
      return await scrapeUrl(url, this.maxCharsPerElement);
    } catch (error) {
      logger.error(`Error scraping URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Enrich search results with scraped content
   * Uses concurrent processing with a configurable limit
   *
   * @param searchResults Search results to enrich
   * @param concurrencyLimit Maximum number of concurrent scraping operations (default: 10)
   * @returns Enriched search results with scraped content
   */
  async enrichSearchResults(
    searchResults: SearchResult[],
    concurrencyLimit = 10,
  ): Promise<EnrichedSearchResult[]> {
    // Statistics tracking
    let scraped = 0;
    let errors = 0;
    let skipped = 0;

    logger.info(
      `Enriching ${searchResults.length} results (concurrency: ${concurrencyLimit})`,
    );

    // Create results array and processing queue
    const enrichedResults: EnrichedSearchResult[] = searchResults.map(
      (result) => ({ ...result }),
    );
    const queue = searchResults.map((_, index) => index);

    // Process in batches with concurrency limit
    const processQueue = async () => {
      while (queue.length > 0) {
        const batch = queue.splice(0, concurrencyLimit);
        const batchPromises = batch.map(async (index) => {
          const result = searchResults[index];
          const enrichedResult = enrichedResults[index];

          if (result.link && this.isValidUrl(result.link)) {
            try {
              const startTime = Date.now();
              const scrapedContent = await this.scrapeUrl(result.link);

              if (scrapedContent) {
                enrichedResult.scraped = scrapedContent;
                scraped++;
                logger.debug(
                  `Scraped ${result.link}: ${scrapedContent.content.length} chars in ${Date.now() - startTime}ms`,
                );
              } else {
                errors++;
              }
            } catch (error) {
              errors++;
              logger.error(`Error scraping: ${result.link}`, error);
            }
          } else {
            skipped++;
          }

          return index;
        });

        await Promise.all(batchPromises);
      }
    };

    const startTime = Date.now();
    await processQueue();
    const totalTime = Date.now() - startTime;

    logger.info(
      `Done: ${scraped} scraped, ${errors} errors, ${skipped} skipped (${totalTime}ms)`,
    );

    return enrichedResults;
  }

  /**
   * Check if a URL is valid for scraping
   *
   * @param url URL to check
   * @returns true if URL is valid, false otherwise
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return (
        (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') &&
        !!parsedUrl.hostname
      );
    } catch (e) {
      return false;
    }
  }
}

// Re-export types and utility functions
export * from './types';
export { scrapeUrl } from './scrape/scrape';
export { htmlToMarkdownTree, markdownTreeToString } from './markdown/tree';
