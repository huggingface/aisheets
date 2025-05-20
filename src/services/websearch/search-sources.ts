import { SerperSearch } from './search/serper-search';
import type { HeaderElement } from './types';

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

export const searchQueriesToSources = async (
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
    sources: filterByBlockList(Array.from(sourcesMap.values())),
    errors,
  };
};
