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
   *
   * @param searchResults Search results to enrich
   * @returns Enriched search results with scraped content
   */
  async enrichSearchResults(
    searchResults: SearchResult[],
  ): Promise<EnrichedSearchResult[]> {
    const enriched: EnrichedSearchResult[] = [];
    let scraped = 0;
    let errors = 0;
    let skipped = 0;

    logger.info(
      `Starting to enrich ${searchResults.length} search results with scraped content`,
    );

    for (const result of searchResults) {
      const enrichedResult: EnrichedSearchResult = { ...result };

      // Only scrape if the result has a valid link
      if (result.link && this.isValidUrl(result.link)) {
        try {
          logger.info(`Scraping content from: ${result.link}`);
          const scrapedContent = await this.scrapeUrl(result.link);

          if (scrapedContent) {
            enrichedResult.scraped = scrapedContent;
            logger.success(
              `Successfully scraped content from ${result.link} (${scrapedContent.content.length} chars)`,
            );
            scraped++;
          } else {
            logger.warn(`No content scraped from ${result.link}`);
            errors++;
          }
        } catch (error) {
          logger.error(`Error enriching search result: ${result.link}`, error);
          errors++;
          // Continue with the original result on error
        }
      } else {
        logger.warn(
          `Skipping invalid URL: ${result.link || 'no link provided'}`,
        );
        skipped++;
      }

      enriched.push(enrichedResult);
    }

    logger.info(
      `Enrichment complete: ${scraped} scraped, ${errors} errors, ${skipped} skipped`,
    );

    return enriched;
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
