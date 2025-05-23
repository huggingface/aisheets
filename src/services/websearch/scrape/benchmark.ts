import { chromium } from 'playwright';
import type { SerializedHTMLElement } from '../types';
import { spatialParser as newParser } from './parser';
import { spatialParser as oldParser } from './parser.old';

// Extend Window interface to include our parser
declare global {
  interface Window {
    spatialParser: ParserFunction;
  }
}

// Define the parser function type
type ParserFunction = () => {
  title: string;
  siteName?: string;
  author?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  elements: SerializedHTMLElement[];
  metrics: {
    clusterCount: number;
  };
};

const TEST_URLS = [
  'https://www.mountainproject.com/route/105748391/classic-climb',
  'https://www.rockandice.com/climbing-news/',
  'https://www.reddit.com/r/climbing/',
  'https://pitchfork.com/features/lists-and-guides/7710-the-top-200-albums-of-the-2000s-20-1/',
  'https://en.wikipedia.org/wiki/Academy_Award_for_Best_Picture',
];

interface ParserMetrics {
  totalTime: number;
  nodeCount: number;
  clusterCount: number;
  finalElementCount: number;
}

async function runParserBenchmark(
  parser: ParserFunction,
  url: string,
): Promise<ParserMetrics> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Capture console logs from the browser
  const logs: string[] = [];
  page.on('console', (msg) => logs.push(msg.text()));

  await page.goto(url, { waitUntil: 'networkidle' });

  // Extract the function body and create a new function in the browser context
  const parserStr = parser.toString();
  const functionBody = parserStr.slice(
    parserStr.indexOf('{') + 1,
    parserStr.lastIndexOf('}'),
  );

  await page.addScriptTag({
    content: `
      window.spatialParser = function() {
        ${functionBody}
      };
    `,
  });

  const startTime = performance.now();
  const result = await page.evaluate(() => {
    return window.spatialParser();
  });
  const totalTime = performance.now() - startTime;

  // Print captured logs
  console.log('\nBrowser logs:');
  for (const log of logs) {
    console.log(log);
  }
  console.log('---\n');

  await browser.close();

  return {
    totalTime,
    nodeCount: result.elements.length,
    clusterCount: result.metrics.clusterCount,
    finalElementCount: result.elements.length,
  };
}

async function main() {
  console.log('Starting parser benchmark...\n');
  const results: Record<string, { old: ParserMetrics; new: ParserMetrics }> =
    {};
  const browser = await chromium.launch();

  try {
    for (const url of TEST_URLS) {
      console.log(`\nBenchmarking ${url}...`);

      // Run old parser
      console.log('Running old parser...');
      const oldMetrics = await runParserBenchmark(oldParser, url);
      console.log('Old parser metrics:', oldMetrics);

      // Run new parser
      console.log('Running new parser...');
      const newMetrics = await runParserBenchmark(newParser, url);
      console.log('New parser metrics:', newMetrics);

      // Store results
      results[url] = { old: oldMetrics, new: newMetrics };

      // Log comparison
      const speedup = oldMetrics.totalTime / newMetrics.totalTime;
      console.log('\nResults:');
      console.log('--------');
      console.log(`Speedup: ${speedup.toFixed(2)}x faster`);
      console.log(`Old parser: ${oldMetrics.totalTime.toFixed(2)}ms`);
      console.log(`New parser: ${newMetrics.totalTime.toFixed(2)}ms`);
      console.log(
        `Elements: ${oldMetrics.finalElementCount} -> ${newMetrics.finalElementCount}`,
      );
      console.log('--------\n');
    }

    // Print summary
    console.log('\nBENCHMARK SUMMARY');
    console.log('================');
    for (const [url, { old, new: newMetrics }] of Object.entries(results)) {
      const speedup = old.totalTime / newMetrics.totalTime;
      console.log(`\n${url}:`);
      console.log(`  Speedup: ${speedup.toFixed(2)}x faster`);
      console.log(`  Old: ${old.totalTime.toFixed(2)}ms`);
      console.log(`  New: ${newMetrics.totalTime.toFixed(2)}ms`);
      console.log(
        `  Elements: ${old.finalElementCount} -> ${newMetrics.finalElementCount}`,
      );
    }
    console.log('\n================\n');
  } finally {
    await browser.close();
  }
}

// Run the benchmark
main().catch(console.error);
