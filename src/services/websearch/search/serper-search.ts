import { cacheGet, cacheSet } from '~/services/cache';
import type { SearchResult } from './types';

/**
 * The Serper API key used for web searches.
 * This value is retrieved from the environment variable `SERPER_API_KEY`.
 */
export const SERPER_API_KEY: string | undefined = process.env.SERPER_API_KEY;

export class SerperSearch {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    // Use the provided API key or the one from environment variables
    const key = apiKey || SERPER_API_KEY;

    if (!key) {
      throw new Error(
        'SerperSearch requires an API key. Set SERPER_API_KEY environment variable or pass it to the constructor.',
      );
    }

    this.apiKey = key;
    this.baseUrl = 'https://google.serper.dev/search';
  }

  async search({
    q,
    num,
  }: {
    q: string;
    num: number;
  }): Promise<SearchResult[]> {
    if (!q) {
      throw new Error('Query is required');
    }

    const cacheKey = q;
    const cachedResult = cacheGet(cacheKey);

    if (cachedResult) {
      console.log('🔍 [SerperSearch] Returning cached results for query:', q);
      return cachedResult;
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q, num }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          '❌ [SerperSearch] API error:',
          response.status,
          errorText,
        );
        throw new Error(
          `Search failed with status: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();

      // Process and format the results to match the expected structure
      const organic = data.organic || [];

      console.log(
        '✅ [SerperSearch] Got',
        organic.length,
        'results for query:',
        q,
      );

      const results = organic.map((result: any) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet || result.description || '',
      }));

      cacheSet(cacheKey, results);

      return results;
    } catch (error: any) {
      console.error('❌ [SerperSearch] Error:', error.message);
      throw new Error(`SerperSearch failed: ${error.message}`);
    }
  }
}
