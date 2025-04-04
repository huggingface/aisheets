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

// Singleton browser management
let browserInstance: Browser | null = null;
let activeContexts = 0;
let browserInitializationPromise: Promise<Browser> | null = null;

/**
 * Get a singleton browser instance with race condition protection
 */
export async function getBrowser(): Promise<Browser> {
  if (browserInitializationPromise) {
    return browserInitializationPromise;
  }

  if (browserInstance?.isConnected()) {
    return browserInstance;
  }

  try {
    browserInitializationPromise = chromium.launch({
      headless: true,
    });

    logger.info('Launching browser');
    browserInstance = await browserInitializationPromise;

    browserInstance.on('disconnected', () => {
      browserInstance = null;
    });

    return browserInstance;
  } finally {
    browserInitializationPromise = null;
  }
}

/**
 * Get a browser context with specific settings
 */
export async function getPlaywrightContext(): Promise<BrowserContext> {
  const browser = await getBrowser();
  activeContexts++;

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ignoreHTTPSErrors: true,
    bypassCSP: true,
  });

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
      await browserInstance.close();
      browserInstance = null;
    } catch (error) {
      logger.error('Error closing browser:', error);
    }
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
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    return await fn(page, response);
  } finally {
    await page.close();
    await context.close();
  }
}

// Auto cleanup
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanupInterval() {
  if (cleanupInterval === null) {
    cleanupInterval = setInterval(() => {
      if (activeContexts === 0 && browserInstance) {
        closeBrowser().catch(() => {});
      }
    }, 60000);

    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  }
}

startCleanupInterval();

// Handle shutdown
const exitHandler = async () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  await closeBrowser();
};

// Remove any existing listeners
const existingListeners = process.listeners('exit');
for (const listener of existingListeners) {
  if (listener.name === 'exitHandler') {
    process.removeListener('exit', listener);
  }
}

process.on('exit', exitHandler);
process.on('SIGINT', () => {
  exitHandler().then(() => process.exit(130));
});
