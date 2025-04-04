import consola from 'consola';
import {
  type Browser,
  type BrowserContext,
  type Page,
  type Response,
  chromium,
} from 'playwright-core';

/**
 * Logger for the Playwright module
 */
const logger = consola.withTag('playwright');

/**
 * Default timeout for operations (in milliseconds)
 */
const DEFAULT_TIMEOUT = 15000;

// Singleton instance
let browserInstance: Browser | null = null;
// Track active contexts to prevent premature browser closure
let activeContexts = 0;
// Promise to track browser initialization to prevent race conditions
let browserInitializationPromise: Promise<Browser> | null = null;

/**
 * Get a singleton browser instance with race condition protection
 */
export async function getBrowser(): Promise<Browser> {
  // If browser initialization is in progress, wait for it
  if (browserInitializationPromise) {
    return browserInitializationPromise;
  }

  // If browser exists and is connected, return it
  if (browserInstance?.isConnected()) {
    return browserInstance;
  }

  // Otherwise, initialize browser with promise tracking to prevent race conditions
  try {
    browserInitializationPromise = chromium.launch({
      headless: true,
    });

    logger.info('Launching browser');
    browserInstance = await browserInitializationPromise;

    // Add event listener for disconnection
    browserInstance.on('disconnected', () => {
      logger.warn('Browser disconnected');
      browserInstance = null;
    });

    return browserInstance;
  } finally {
    // Clear initialization promise to allow future launches if needed
    browserInitializationPromise = null;
  }
}

/**
 * Get a browser context with specific settings
 */
export async function getPlaywrightContext(): Promise<BrowserContext> {
  const browser = await getBrowser();

  // Track active context
  activeContexts++;

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ignoreHTTPSErrors: true,
    bypassCSP: true,
  });

  // Set up listener to track when context is closed
  context.on('close', () => {
    activeContexts--;
  });

  return context;
}

/**
 * Close the browser instance gracefully, but only if no contexts are active
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance && activeContexts === 0) {
    try {
      logger.info('Closing browser - no active contexts');
      await browserInstance.close();
      browserInstance = null;
    } catch (error) {
      logger.error('Error closing browser:', error);
    }
  } else if (activeContexts > 0) {
    logger.info(`Not closing browser - ${activeContexts} active contexts`);
  }
}

/**
 * Execute operations with a page
 */
export async function withPage<T>(
  url: string,
  fn: (page: Page, response: Response | null) => Promise<T>,
): Promise<T> {
  const context = await getPlaywrightContext();
  const page = await context.newPage();

  try {
    logger.info(`Navigating to: ${url}`);
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    logger.info(`Loaded page: ${url}`);
    const result = await fn(page, response);

    return result;
  } finally {
    await page.close();
    await context.close();
  }
}

// Automatic cleanup based on time rather than just process signals
let cleanupInterval: NodeJS.Timeout | null = null;

// Start the cleanup interval when the module is imported
function startCleanupInterval() {
  if (cleanupInterval === null) {
    // Check every 60 seconds if we can close the browser
    cleanupInterval = setInterval(() => {
      if (activeContexts === 0 && browserInstance) {
        closeBrowser().catch(() => {});
      }
    }, 60000);

    // Don't let the interval prevent the process from exiting
    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  }
}

startCleanupInterval();

// Set up cleanup handlers for graceful shutdown
process.on('SIGINT', async () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  await closeBrowser();
  process.exit(130);
});

const exitHandler = async () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  await closeBrowser();
};

// Remove any existing listeners first
const existingListeners = process.listeners('exit');
for (const listener of existingListeners) {
  if (listener.name === 'exitHandler') {
    process.removeListener('exit', listener);
  }
}

// Then add your listener
process.on('exit', exitHandler);
