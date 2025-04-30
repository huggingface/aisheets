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

  async search(query: string): Promise<SearchResult[]> {
    if (!query) {
      throw new Error('Query is required');
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query }),
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
        query,
      );

      return organic.map((result: any) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet || result.description || '',
      }));
    } catch (error: any) {
      console.error('❌ [SerperSearch] Error:', error.message);
      throw new Error(`SerperSearch failed: ${error.message}`);
    }
  }
}

/**
 * Creates a web search tool that can be used with AI assistants
 */
export const createWebSearchTool = (serperSearch: SerperSearch) => ({
  name: 'web_search',
  description:
    'Searches the web and returns relevant results. Each result includes title, link, and snippet.',
  examples: [
    {
      prompt: 'What are the latest news about AI?',
      code: "web_search('latest AI news and developments')",
      tools: ['web_search'],
    },
  ],
  call: async (input: any) => {
    const query = await input;
    if (typeof query !== 'string') {
      throw new Error('Query must be a string');
    }
    try {
      const results = await serperSearch.search(query);
      return results;
    } catch (error: any) {
      console.error('Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  },
});
