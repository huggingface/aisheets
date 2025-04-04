import consola from 'consola';
import { type Browser, type BrowserContext, chromium } from 'playwright-core';

/**
 * Logger for the Playwright module
 */
const logger = consola.withTag('playwright');

/**
 * Default timeout for operations (in milliseconds)
 */
const DEFAULT_TIMEOUT = 15000;

/**
 * Browser singleton to avoid creating multiple instances
 */
let browserSingleton: Promise<Browser> | undefined;

/**
 * Get or create a shared browser instance
 */
async function getBrowser(): Promise<Browser> {
  const browser = await chromium.launch({ headless: true });

  // Handle disconnection to reset the singleton
  browser.on('disconnected', () => {
    logger.warn('Browser closed');
    browserSingleton = undefined;
  });

  return browser;
}

/**
 * Get a new browser context with optimized settings
 */
async function getPlaywrightContext(): Promise<BrowserContext> {
  // Initialize browser singleton if not already done
  if (!browserSingleton) {
    browserSingleton = getBrowser();
  }

  const browser = await browserSingleton;

  // Optimize context settings for better performance and accuracy
  return browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    // Reduce motion for faster loading
    reducedMotion: 'reduce',
    // Block downloads for security
    acceptDownloads: false,
  });
}

/**
 * A wrapper function to run operations with a Playwright browser page
 */
export async function withPage<T>(
  url: string,
  fn: (page: any, response: any) => Promise<T>,
  timeout = DEFAULT_TIMEOUT,
): Promise<T> {
  const ctx = await getPlaywrightContext();

  try {
    logger.info(`Opening page for URL: ${url}`);
    const page = await ctx.newPage();

    // Block non-HTTPS resources for security (optional, remove if needed)
    await page.route('**', (route, request) => {
      const requestUrl = request.url();
      if (!requestUrl.startsWith('https://')) {
        logger.warn(`Blocked request to: ${requestUrl}`);
        return route.abort();
      }
      return route.continue();
    });

    // Set timeout for navigation
    page.setDefaultTimeout(timeout);

    // Navigate to the URL
    logger.info(`Navigating to: ${url}`);
    const response = await page
      .goto(url, {
        waitUntil: 'domcontentloaded',
        timeout,
      })
      .catch(() => {
        logger.warn(`Failed to load page within ${timeout / 1000}s: ${url}`);
        return undefined;
      });

    // Run the provided function with the page and response
    logger.info('Page loaded, executing handler function');
    const result = await fn(page, response ?? undefined);

    return result;
  } finally {
    // Close the context when done
    await ctx.close();
    logger.info('Browser context closed');
  }
}

/**
 * Explicitly close the browser singleton when shutting down
 */
export async function closeBrowser(): Promise<void> {
  if (browserSingleton) {
    try {
      const browser = await browserSingleton;
      await browser.close();
      browserSingleton = undefined;
      logger.info('Browser singleton closed');
    } catch (error) {
      logger.error('Error closing browser singleton:', error);
    }
  }
}
