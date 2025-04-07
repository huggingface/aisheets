import type { RequestEventBase } from '@builder.io/qwik-city';
import { type InferenceProvider, chatCompletion } from '@huggingface/inference';
import {
  DEFAULT_MODEL,
  DEFAULT_MODEL_PROVIDER,
  INFERENCE_TIMEOUT,
  SERPER_API_KEY,
} from '~/config';
import {
  TransformersJSEmbeddingModel,
  WebScraper,
  createEmbeddings,
} from '~/services/websearch';
import type { SearchResult } from '~/services/websearch/search';
import { useServerSession } from '~/state';

/**
 * Default model to use when none is specified (or when config is empty)
 */
const FALLBACK_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';

/**
 * Maximum number of search queries to request from the model
 */
const MAX_NUM_SEARCH_QUERIES = 2;

// Create a single instance of the embedding model
const embeddingModel = new TransformersJSEmbeddingModel();

export interface AssistantParams {
  accessToken?: string;
  modelName?: string;
  modelProvider?: string;
  instruction: string;
  searchEnabled?: boolean;
  timeout?: number;
  serperApiKey?: string; // Allow overriding the API key
  maxSearchQueries?: number; // Number of search queries to request
  enableScraping?: boolean; // Whether to scrape content from search results
}

export interface WebSearchQuery {
  column: string;
  query: string;
}

export interface ColumnSourcesResult {
  [columnName: string]: {
    // In the current version, we only return the queries
    queries: string[];
    // For future implementation
    sources?: SearchResult[];
  };
}

/**
 * Regular expressions to extract search queries from assistant output
 */
// Pattern for websearch("query") format
const WEB_SEARCH_REGEX = /websearch\(['"]([^'"]+)['"]\)/g;

// Simple pattern for indented queries like "- query text"
const SIMPLE_QUERY_REGEX = /^\s*-\s+(.+)$/;

// Pattern to extract quoted text - handles both single and double quotes
const QUOTED_TEXT_REGEX = /["']([^"']+)["']/;

/**
 * Template for the search-enabled prompt
 */
const SEARCH_PROMPT_TEMPLATE = `
Given this request: 

{instruction}

First, identify the main columns needed for this dataset.
Then, create specific search queries that will help gather information for the entire dataset.

Your response must follow this exact format:

COLUMNS:
- column_name1
- column_name2
- column_name3

SEARCH QUERIES:
- "specific search query 1"
- "specific search query 2"

Only include columns that are directly relevant to the request. Create exactly {maxSearchQueries} specific search queries that will help gather comprehensive information for all columns.
`.trim();

/**
 * Template for the prompt when search is disabled
 */
const NO_SEARCH_PROMPT_TEMPLATE = `
Given this request: 

{instruction}

Identify the main columns needed for this dataset.

Your response must follow this exact format:

COLUMNS:
- column_name1
- column_name2
- column_name3

Only include columns that are directly relevant to the request.
`.trim();

/**
 * Organize extracted queries by column
 */
function organizeQueriesByColumn(
  queries: WebSearchQuery[],
): ColumnSourcesResult {
  const result: ColumnSourcesResult = {};

  for (const { column, query } of queries) {
    if (!result[column]) {
      result[column] = { queries: [] };
    }

    result[column].queries.push(query);
  }

  return result;
}

/**
 * Function to extract column names and search queries from the assistant output
 */
function extractWebSearchResults(text: string, searchEnabled = true) {
  console.log('⚙️ [Assistant] Extracting results from text:', text);

  const columns: string[] = [];
  const queries: string[] = [];

  let currentSection: 'columns' | 'queries' | null = null;
  const lines = text.split('\n');

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Check if line defines a section
    if (line.match(/^COLUMNS:$/i)) {
      currentSection = 'columns';
      console.log('⚙️ [Assistant] Found COLUMNS section');
      continue;
    }

    if (searchEnabled && line.match(/^SEARCH QUERIES:$/i)) {
      currentSection = 'queries';
      console.log('⚙️ [Assistant] Found SEARCH QUERIES section');
      continue;
    }

    // Skip processing if no section has been identified yet
    if (!currentSection) continue;

    // Extract bulleted items
    const bulletMatch = line.match(/^\s*-\s+(.+)$/);
    if (bulletMatch) {
      const item = bulletMatch[1].trim();

      if (currentSection === 'columns') {
        columns.push(item);
        console.log('⚙️ [Assistant] Added column:', item);
      }

      if (searchEnabled && currentSection === 'queries') {
        // If the item is quoted, extract just the quoted text
        const quotedMatch = item.match(/^["'](.+)["']$/);
        const query = quotedMatch ? quotedMatch[1] : item;
        queries.push(query);
        console.log('⚙️ [Assistant] Added search query:', query);
      }
    }
  }

  console.log('⚙️ [Assistant] Extracted columns:', columns);
  if (searchEnabled) {
    console.log('⚙️ [Assistant] Extracted queries:', queries);
  }

  return { columns, queries };
}

/**
 * Handle errors from the inference API
 */
const handleError = (e: unknown): string => {
  console.error('🔍 [Assistant] Full error:', e);
  if (e instanceof Error) {
    console.error('🔍 [Assistant] Error name:', e.name);
    console.error('🔍 [Assistant] Error message:', e.message);
    console.error('🔍 [Assistant] Error stack:', e.stack);
    return e.message;
  }
  return JSON.stringify(e);
};

/**
 * Check if an API key is valid (has at least 10 characters)
 */
function isValidApiKey(key?: string): boolean {
  return !!key && key.length >= 10;
}

/**
 * Search result with optional scraped content
 */
export interface SearchResultWithContent extends SearchResult {
  scrapedContent?: string;
  scrapedTitle?: string;
  // Add embedding info for UI display
  embeddingChunks?: Array<{
    text: string;
    embedding: number[]; // The actual vector
    type?: string; // Type of element (e.g., 'header', 'paragraph')
    parentHeader?: string; // Parent header for context
    metadata?: Record<string, any>; // Additional metadata
  }>;
}

/**
 * Executes the assistant with the provided parameters
 */
export const runAssistant = async function (
  this: RequestEventBase<QwikCityPlatform>,
  {
    modelName,
    modelProvider = DEFAULT_MODEL_PROVIDER,
    instruction,
    searchEnabled = false,
    timeout,
    serperApiKey,
    maxSearchQueries = MAX_NUM_SEARCH_QUERIES,
    enableScraping = false,
  }: AssistantParams,
): Promise<
  | string
  | {
      columns: string[];
      queries: string[];
      sources?: SearchResultWithContent[];
    }
> {
  // Get the session directly from the request context
  const session = useServerSession(this);

  // Use the model name from config if none is specified
  const finalModelName = modelName || DEFAULT_MODEL || FALLBACK_MODEL;

  // Use the model provider directly from config
  const finalModelProvider = modelProvider;

  console.log('🚀 [Assistant] Starting assistant execution');
  console.log('⚙️ [Assistant] Parameters:', {
    modelName: finalModelName,
    modelProvider: finalModelProvider,
    instruction:
      instruction.substring(0, 100) + (instruction.length > 100 ? '...' : ''),
    searchEnabled,
    maxSearchQueries,
    enableScraping,
  });

  // Log token information for debugging (safely)
  console.log('🔑 [Assistant] Token info:', {
    sessionTokenLength: session.token?.length || 0,
    sessionTokenPrefix: session.token
      ? `${session.token.substring(0, 4)}...`
      : 'none',
  });

  // Prepare the prompt
  const promptText = searchEnabled
    ? SEARCH_PROMPT_TEMPLATE.replace('{instruction}', instruction).replace(
        '{maxSearchQueries}',
        maxSearchQueries.toString(),
      )
    : NO_SEARCH_PROMPT_TEMPLATE.replace('{instruction}', instruction);

  console.log('⚙️ [Assistant] Using search enabled:', searchEnabled);
  console.log('\n🔷 Assistant Prompt 🔷');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Model:', finalModelName);
  console.log('Provider:', finalModelProvider);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Prompt:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(promptText);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔷 End Prompt 🔷\n');

  try {
    // Call the Hugging Face inference API using the standard chatCompletion method
    const response = await chatCompletion(
      {
        model: finalModelName,
        messages: [{ role: 'user', content: promptText }],
        provider: finalModelProvider as InferenceProvider,
        accessToken: session.token,
      },
      {
        signal: AbortSignal.timeout(timeout ?? INFERENCE_TIMEOUT),
      },
    );

    // Get response content, ensuring it's a non-empty string
    const responseText = response.choices[0].message.content || '';
    console.log(
      '⚙️ [Assistant] Response received:',
      responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
    );

    // Extract columns and search queries from the assistant output
    const { columns, queries } = extractWebSearchResults(
      responseText,
      searchEnabled,
    );

    // If no structured data found, return the original response
    if (columns.length === 0) {
      console.log(
        '⚙️ [Assistant] No columns found, returning original response',
      );
      return responseText;
    }

    // If search is not enabled, just return the columns
    if (!searchEnabled) {
      console.log('⚙️ [Assistant] Search not enabled, returning columns only');
      return { columns, queries: [] };
    }

    // If search is enabled but no queries found, return just the columns
    if (queries.length === 0) {
      console.log(
        '⚙️ [Assistant] No search queries found, returning columns only',
      );
      return { columns, queries: [] };
    }

    // If we have queries and search is enabled, perform web searches
    if (queries.length > 0) {
      console.log(
        '⚙️ [Assistant] Found search queries, performing web searches',
      );

      // Use the provided API key, otherwise use the one from environment
      const apiKey = serperApiKey || SERPER_API_KEY;

      // Check if API key is valid
      if (!isValidApiKey(apiKey)) {
        console.log('❌ [Assistant] Error: No valid Serper API key provided');
        return {
          columns,
          queries,
          sources: [
            {
              title: 'Search Error',
              link: '',
              snippet:
                'No valid Serper API key provided for web search. Please set the SERPER_API_KEY environment variable or provide it directly.',
            },
          ],
        };
      }

      try {
        // Import SerperSearch dynamically to ensure it exists
        const { SerperSearch } = await import('~/services/websearch/search');

        console.log('⚙️ [Assistant] Initializing SerperSearch with API key');
        const serper = new SerperSearch(apiKey);

        // Perform web searches for all queries
        const sources: SearchResult[] = [];

        console.log(
          `⚙️ [Assistant] Starting searches for ${queries.length} queries`,
        );

        for (const query of queries) {
          try {
            console.log(`⚙️ [Assistant] Searching for query: "${query}"`);

            // Perform web search
            const searchResults = await serper.search(query);
            console.log(
              `⚙️ [Assistant] Got ${searchResults.length} results for "${query}"`,
            );

            // Add search results to the combined sources
            sources.push(...searchResults);
          } catch (error) {
            console.error(
              `❌ [Assistant] Error searching for "${query}":`,
              error,
            );

            // Add the error message as a source so it's visible to the user
            sources.push({
              title: 'Search Error',
              link: '',
              snippet: `Failed to search for "${query}": ${error instanceof Error ? error.message : String(error)}`,
            });
          }
        }

        console.log('✅ [Assistant] Completed all searches');
        console.log('✅ [Assistant] Found', sources.length, 'total results');

        // Deduplicate sources by link
        const uniqueSources = Array.from(
          new Map(
            sources.map((source) => [source.link || source.title, source]),
          ).values(),
        );

        console.log(
          '✅ [Assistant] Deduplicated to',
          uniqueSources.length,
          'unique results',
        );

        // If scraping is enabled, scrape the content from the search results
        let resultWithContent: SearchResultWithContent[] = uniqueSources;

        if (enableScraping) {
          try {
            console.log('⚙️ [Assistant] Scraping content from search results');
            console.log(
              `⚙️ [Assistant] Will attempt to scrape ${uniqueSources.length} result URLs`,
            );

            // Create a new WebScraper instance
            const scraper = new WebScraper();
            const scrapeStartTime = Date.now();

            // Enrich the search results with scraped content
            const enrichedResults =
              await scraper.enrichSearchResults(uniqueSources);

            const scrapeEndTime = Date.now();
            const scrapeDuration = scrapeEndTime - scrapeStartTime;

            // Convert the enriched results to the expected format
            resultWithContent = enrichedResults.map((result) => {
              const enhanced: SearchResultWithContent = {
                title: result.title,
                link: result.link || '',
                snippet: result.snippet,
              };

              if (result.scraped) {
                enhanced.scrapedTitle = result.scraped.title;

                // Store the markdown content
                if (result.scraped.content) {
                  enhanced.scrapedContent = result.scraped.content;

                  // Create a preview snippet from the content
                  const previewLength = 200;
                  const plainText = result.scraped.content
                    .replace(/#+ /g, '') // Remove headers
                    .replace(/\*\*/g, '') // Remove bold
                    .replace(/\n+/g, ' ') // Normalize whitespace
                    .trim();

                  enhanced.snippet =
                    plainText.substring(0, previewLength) +
                    (plainText.length > previewLength ? '...' : '');
                }
              }

              return enhanced;
            });

            const scrapedCount = resultWithContent.filter(
              (r) => r.scrapedContent,
            ).length;

            console.log(
              `✅ [Assistant] Scraped content from ${scrapedCount}/${uniqueSources.length} search results (took ${scrapeDuration}ms)`,
            );

            if (scrapedCount > 0) {
              const totalChars = resultWithContent.reduce(
                (sum, r) => sum + (r.scrapedContent?.length || 0),
                0,
              );
              console.log(
                `✅ [Assistant] Total content scraped: ${totalChars.toLocaleString()} characters`,
              );
              console.log(
                `✅ [Assistant] Average content per result: ${Math.floor(totalChars / scrapedCount).toLocaleString()} characters`,
              );

              // Create embeddings for scraped content
              if (enableScraping && resultWithContent.length > 0) {
                try {
                  const sourcesForEmbedding = enrichedResults
                    .filter((r) => r.scraped?.markdownTree)
                    .map((r) => ({
                      url: r.link || '',
                      title: r.title,
                      page: r.scraped!,
                    }));

                  const embeddedSources = await createEmbeddings(
                    sourcesForEmbedding,
                    embeddingModel,
                  );

                  for (const embeddedSource of embeddedSources) {
                    const resultToEnhance = resultWithContent.find(
                      (r) => r.link === embeddedSource.url,
                    );
                    if (resultToEnhance) {
                      resultToEnhance.embeddingChunks = embeddedSource.chunks;
                    }
                  }
                } catch (error) {
                  console.error('Error creating embeddings:', error);
                }
              }
            }
          } catch (error) {
            console.error('❌ [Assistant] Error scraping content:', error);
            // Continue with the original results on error
          }
        }

        return { columns, queries, sources: resultWithContent };
      } catch (error) {
        console.error('❌ [Assistant] Error initializing SerperSearch:', error);
        return {
          columns,
          queries,
          sources: [
            {
              title: 'Search Error',
              link: '',
              snippet: `Error initializing search: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }

    // If no queries to search for, just return the columns and queries
    return { columns, queries };
  } catch (error) {
    const errorMessage = handleError(error);
    console.error('❌ [Assistant] Error in assistant execution:', errorMessage);
    return errorMessage;
  }
};
