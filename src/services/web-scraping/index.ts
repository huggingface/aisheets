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
      logger.info(`Scraping URL: ${url}`);
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
      `Starting to enrich ${searchResults.length} search results with scraped content (concurrency: ${concurrencyLimit})`,
    );

    // Create an array to store the results in the same order as the input
    const enrichedResults = searchResults.map((result) => ({ ...result }));

    // Create a queue of indexes to process
    const queue = searchResults.map((_, index) => index);

    // Process in batches with concurrency limit
    const processQueue = async () => {
      // Process in batches based on concurrency limit
      while (queue.length > 0) {
        const batch = queue.splice(0, concurrencyLimit);
        const batchPromises = batch.map(async (index) => {
          const result = searchResults[index];
          const enrichedResult = enrichedResults[index];

          // Only scrape if the result has a valid link
          if (result.link && this.isValidUrl(result.link)) {
            try {
              logger.info(`Scraping content from: ${result.link}`);
              const startTime = Date.now();
              const scrapedContent = await this.scrapeUrl(result.link);

              if (scrapedContent) {
                enrichedResult.scraped = scrapedContent;
                scraped++;
                logger.success(
                  `Successfully scraped content from ${result.link} (${scrapedContent.content.length} chars, took ${Date.now() - startTime}ms)`,
                );
              } else {
                errors++;
                logger.warn(`No content scraped from ${result.link}`);
              }
            } catch (error) {
              errors++;
              logger.error(
                `Error enriching search result: ${result.link}`,
                error,
              );
            }
          } else {
            skipped++;
            logger.warn(
              `Skipping invalid URL: ${result.link || 'no link provided'}`,
            );
          }

          return index;
        });

        // Wait for this batch to complete before moving to the next
        await Promise.all(batchPromises);
      }
    };

    // Start processing the queue
    const startTime = Date.now();
    await processQueue();
    const totalTime = Date.now() - startTime;

    // Log completion statistics
    logger.info(
      `Enrichment complete: ${scraped} scraped, ${errors} errors, ${skipped} skipped (took ${totalTime}ms)`,
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
