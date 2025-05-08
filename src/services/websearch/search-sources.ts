import { indexDatasetSources } from './embed/engine';
import { scrapeUrlsBatch } from './scrape';
import { SerperSearch } from './search';
import type { HeaderElement } from './types';

import { trackTime } from './utils/track-time';

import * as config from '~/config';

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
}: {
  dataset: {
    id: string;
    name: string;
  };
  queries: string[];
  options: {
    accessToken: string;
  };
}): Promise<{
  sources: WebSource[];
  errors?: ErrorSource[];
}> {
  if (!queries || queries.length === 0) throw new Error('No queries provided');
  if (!dataset || !dataset.id) throw new Error('No dataset provided');

  const { sources: webSources, errors } = await trackTime(() => {
    console.log('Time for searchQueriesToSources');
    return searchQueriesToSources(queries);
  });

  const scrappedUrls = await trackTime(() => {
    console.log('Time for scrapeUrlsBatch');
    return scrapeUrlsBatch(webSources.map((source) => source.url));
  });

  for (const source of webSources) {
    const scrapped = scrappedUrls.get(source.url);
    if (scrapped) source.markdownTree = scrapped.markdownTree;
  }

  const indexSize = await trackTime(() => {
    console.log('Time for indexDatasetSources');

    return indexDatasetSources({
      dataset,
      sources: webSources,
      options,
    });
  });

  if (indexSize === 0) {
    console.error('No sources indexed');
    return { sources: [], errors };
  }

  return {
    sources: webSources,
    errors,
  };
}

const searchQueriesToSources = async (
  queries: string[],
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
      const webSearch = await serper.search(`${queryWithBlock} -filetype:pdf`);

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
    sources: filterByBlockList(Array.from(sourcesMap.values())).slice(0, 5),
    errors,
  };
};
