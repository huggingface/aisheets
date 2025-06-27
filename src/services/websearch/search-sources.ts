import { SerperSearch } from './search/serper-search';
import type { HeaderElement } from './types';

import * as config from '~/config';
import { checkSourceExists, indexDatasetSources } from './embed/engine';
import { scrapeUrlsBatch } from './scrape';
import { trackTime } from './utils/track-time';

export interface WebSource {
  url: string;
  title?: string;
  snippet?: string;
  markdownTree?: HeaderElement;

  contentType: 'web';
}

export interface ErrorSource {
  title: string;
  snippet: string;
  contentType: 'error';
}

export interface Source {
  title?: string;
  url?: string;
  snippet?: string;
  content?: string;
  contentType?: string; // 'web', 'pdf', 'docx', etc.
  markdownTree?: HeaderElement;
  chunks?: Array<{
    text: string;
    embedding?: number[];
    type?: string;
    parentHeader?: string;
    metadata?: Record<string, any>;
  }>;
}

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

export async function createSourcesFromWebQueries({
  dataset,
  queries,
  options,
  maxSources,
}: {
  dataset: {
    id: string;
    name: string;
  };
  queries: string[];
  options: {
    accessToken: string;
  };
  maxSources?: number;
}): Promise<{
  sources: WebSource[];
  errors?: ErrorSource[];
}> {
  if (!queries || queries.length === 0) throw new Error('No queries provided');
  if (!dataset || !dataset.id) throw new Error('No dataset provided');

  console.log(
    `[createSourcesFromWebQueries] Starting for dataset ${dataset.name} with ${queries.length} queries`,
  );

  const { sources: webSources, errors } = await trackTime(async () => {
    console.log('Time for searchQueriesToSources');
    console.log(queries);
    return await searchQueriesToSources(queries, maxSources);
  });

  // Filter out sources that already exist in the vector DB
  const newSources: WebSource[] = [];
  const existingSources: WebSource[] = [];
  for (const source of webSources) {
    const exists = await checkSourceExists({
      dataset,
      sourceUri: source.url,
    });

    if (!exists) newSources.push(source);
    else existingSources.push(source);
  }

  console.log(
    `[createSourcesFromWebQueries] ${existingSources.length} sources already exist, ${newSources.length} new sources to process`,
  );

  // Only scrape and index new sources
  if (newSources.length > 0) {
    const scrappedUrls = await trackTime(async () => {
      const results = new Map<string, Source>();
      for await (const { url, result } of scrapeUrlsBatch(
        newSources.map((source) => source.url),
      )) {
        if (!result) continue;
        results.set(url, result);
      }
      return results;
    });

    let scrapedCount = 0;
    for (const source of newSources) {
      const scrapped = scrappedUrls.get(source.url);
      if (scrapped) {
        source.markdownTree = scrapped.markdownTree;
        scrapedCount++;
      }
    }
    console.log(
      `[createSourcesFromWebQueries] Successfully scraped ${scrapedCount} out of ${newSources.length} new sources`,
    );

    const indexSize = await trackTime(() => {
      console.log('Time for indexDatasetSources');
      return indexDatasetSources({
        dataset,
        sources: newSources.filter((s) => s.markdownTree), // Only index successfully scraped new sources
        options,
      });
    });

    if (indexSize === 0) {
      console.error(
        '[createSourcesFromWebQueries] No new sources were indexed',
      );
    } else {
      console.log(
        `[createSourcesFromWebQueries] Successfully indexed ${indexSize} new sources`,
      );
    }
  } else {
    console.log(
      '[createSourcesFromWebQueries] All sources already exist in the vector DB, skipping scraping and indexing',
    );
  }

  // Return all sources (both new and existing) to maintain the same interface
  return {
    sources: webSources,
    errors,
  };
}

export const searchQueriesToSources = async (
  queries: string[],
  maxSources = 10,
): Promise<{
  sources: WebSource[];
  errors?: ErrorSource[];
}> => {
  // Check if the API key is set
  if (!config.SERPER_API_KEY) throw new Error('No SERPER API key provided');

  const sourcesMap = new Map<string, WebSource>();
  const serper = new SerperSearch(config.SERPER_API_KEY);

  const errors = [] as ErrorSource[];

  for (const query of queries) {
    try {
      // Add blocklist to the query string
      const queryWithBlock = addBlockListToQuery(query, config.BLOCKED_URLS);
      const webSearch = await serper.search({
        q: `${queryWithBlock} -filetype:pdf`,
        num: maxSources,
      });

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

  return {
    sources: filterByBlockList(Array.from(sourcesMap.values())).slice(
      0,
      maxSources,
    ),
    errors,
  };
};
