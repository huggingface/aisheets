import * as config from '~/config';
import { flattenTree, stringifyMarkdownElement } from './markdown';
import { scrapeUrlsBatch } from './scrape';
import { SerperSearch } from './search';
import type { ErrorSource, WebSource } from './search-sources';

// Utility function to add blocklist to search query
function addBlockListToQuery(query: string, blockList: string[]): string {
  if (!blockList.length) return query;
  const blockFilters = blockList.map((domain) => `-site:${domain}`).join(' ');
  return `${query} ${blockFilters}`;
}

// Utility function to filter results by blocklist
function filterByBlockList<T extends { url: string }>(results: T[]): T[] {
  return results.filter(
    (result) =>
      !config.BLOCKED_URLS.some((blocked) => result.url.includes(blocked)),
  );
}

async function searchQueriesToSources(queries: string[]): Promise<{
  sources: WebSource[];
  errors?: ErrorSource[];
}> {
  // Check if the API key is set
  if (!config.SERPER_API_KEY) throw new Error('No SERPER API key provided');

  const sourcesMap = new Map<string, WebSource>();
  const serper = new SerperSearch(config.SERPER_API_KEY);

  const errors = [] as ErrorSource[];

  for (const query of queries) {
    try {
      // Add blocklist to the query string
      const queryWithBlock = addBlockListToQuery(query, config.BLOCKED_URLS);
      const webSearch = await serper.search(queryWithBlock);

      for (const result of webSearch) {
        if (!result.link) continue;

        const source: WebSource = {
          ...result,
          url: result.link!,
          title: result.title || 'Untitled',
          contentType: 'web',
        };

        // Check if the source already exists
        const sourceKey = source.url!;
        if (sourcesMap.has(sourceKey)) continue;

        sourcesMap.set(sourceKey!, source);
      }
    } catch (error) {
      console.error(`Error searching for query "${query}":`, error);
      errors.push({
        title: 'Search Error',
        snippet: `Failed to search for "${query}": ${error instanceof Error ? error.message : String(error)}`,
        contentType: 'error',
      });
    }
  }

  // Filter results by blocklist for extra safety
  return {
    sources: filterByBlockList(Array.from(sourcesMap.values())).slice(0, 5),
    errors,
  };
}

export async function runDebugPipeline(query: string) {
  // Step 1: Web Search
  const { sources, errors } = await searchQueriesToSources([query]);

  // Step 2: Scrape URLs
  const scrappedUrls = await scrapeUrlsBatch(
    sources.map((source) => source.url),
  );

  // Step 3: Process chunks
  const processedSources = sources
    .map((source: WebSource) => {
      const scrapped = scrappedUrls.get(source.url);
      if (!scrapped?.markdownTree) return null;

      const mdElements = flattenTree(scrapped.markdownTree);
      const chunks = mdElements
        .map(stringifyMarkdownElement)
        .filter((text) => text.length > 200); // Skip chunks with 200 or fewer characters

      return {
        url: source.url,
        title: source.title || 'Untitled',
        chunks,
        content: scrapped.content, // Include raw content for debugging
        markdownTree: scrapped.markdownTree, // Include markdown tree for debugging
      };
    })
    .filter(
      (
        source,
      ): source is {
        url: string;
        title: string;
        chunks: string[];
        content: string;
        markdownTree: any;
      } => source !== null,
    );

  return {
    sources: processedSources,
    errors,
  };
}
