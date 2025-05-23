import { type ConsoleMessage, chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SerializedHTMLElement } from '../types';
import { spatialParser as newParser } from './parser';
import { spatialParser as oldParser } from './parser.old';

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
];

interface ParserMetrics {
  totalTime: number;
  nodeCount: number;
  clusterCount: number;
  finalElementCount: number;
}

describe('Parser Benchmark', () => {
  let browser: any;
  const results: Record<string, { old: ParserMetrics; new: ParserMetrics }> =
    {};

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();

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
      console.log(
        `  Clusters: ${old.clusterCount} -> ${newMetrics.clusterCount}`,
      );
    }
    console.log('\n================\n');
  });

  for (const url of TEST_URLS) {
    it(`benchmarks ${url}`, async () => {
      const page = await browser.newPage();

      // Capture console logs
      const logs: string[] = [];
      page.on('console', (msg: ConsoleMessage) => logs.push(msg.text()));

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Run old parser
      console.log(`\nRunning old parser on ${url}...`);
      const oldStartTime = performance.now();
      const oldResult = await page.evaluate(oldParser);
      const oldTotalTime = performance.now() - oldStartTime;

      // Print old parser logs
      console.log('\nOld parser logs:');
      for (const log of logs) {
        console.log(log);
      }
      console.log('---\n');

      // Clear logs
      logs.length = 0;

      // Run new parser
      console.log(`Running new parser on ${url}...`);
      const newStartTime = performance.now();
      const newResult = await page.evaluate(newParser);
      const newTotalTime = performance.now() - newStartTime;

      // Print new parser logs
      console.log('\nNew parser logs:');
      for (const log of logs) {
        console.log(log);
      }
      console.log('---\n');

      await page.close();

      const oldMetrics: ParserMetrics = {
        totalTime: oldTotalTime,
        nodeCount: oldResult.elements.length,
        clusterCount: oldResult.metrics.clusterCount,
        finalElementCount: oldResult.elements.length,
      };

      const newMetrics: ParserMetrics = {
        totalTime: newTotalTime,
        nodeCount: newResult.elements.length,
        clusterCount: newResult.metrics.clusterCount,
        finalElementCount: newResult.elements.length,
      };

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
      console.log(
        `Clusters: ${oldMetrics.clusterCount} -> ${newMetrics.clusterCount}`,
      );
      console.log('--------\n');

      // Add assertions to make it a proper test
      expect(newMetrics.clusterCount).toBeGreaterThan(0);
      expect(newMetrics.finalElementCount).toBeGreaterThan(0);
    }, 60000); // 60 second timeout per test
  }
});
