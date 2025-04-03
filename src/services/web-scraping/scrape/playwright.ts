import consola from 'consola';
import { chromium } from 'playwright-core';

/**
 * Logger for the Playwright module
 */
const logger = consola.withTag('playwright');

/**
 * Default timeout for operations (in milliseconds)
 */
const DEFAULT_TIMEOUT = 15000;

/**
 * A wrapper function to run operations with a Playwright browser page
 */
export async function withPage<T>(
  url: string,
  fn: (page: any, response: any) => Promise<T>,
  timeout = DEFAULT_TIMEOUT,
): Promise<T> {
  // Launch a headless browser
  const browser = await chromium.launch({ headless: true });

  try {
    logger.info(`Opening browser for URL: ${url}`);

    // Create a new browser context with a realistic user agent
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    // Open a new page
    const page = await context.newPage();

    // Set a timeout for navigation
    page.setDefaultTimeout(timeout);

    // Navigate to the URL
    logger.info(`Navigating to: ${url}`);
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    // Run the provided function with the page and response
    logger.info('Page loaded, executing handler function');
    const result = await fn(page, response);

    // Close the context and return the result
    await context.close();
    logger.success(`Successfully processed: ${url}`);
    return result;
  } catch (error) {
    logger.error(`Error processing URL ${url}:`, error);
    throw error;
  } finally {
    // Always close the browser
    await browser.close();
    logger.info('Browser closed');
  }
}
