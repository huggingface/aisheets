import type { RequestEventBase } from '@builder.io/qwik-city';
import { type InferenceProvider, chatCompletion } from '@huggingface/inference';
import {
  DEFAULT_MODEL,
  DEFAULT_MODEL_PROVIDER,
  INFERENCE_TIMEOUT,
} from '~/config';
import {
  type Source,
  collectSearchSources,
} from '~/services/websearch/search-sources';
import { useServerSession } from '~/state';

/**
 * Default model to use when none is specified (or when config is empty)
 */
const FALLBACK_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';

/**
 * Maximum number of search queries to request from the model
 */
const MAX_NUM_SEARCH_QUERIES = 2;

export interface AssistantParams {
  accessToken?: string;
  modelName?: string;
  modelProvider?: string;
  instruction: string;
  searchEnabled?: boolean;
  timeout?: number;
  maxSearchQueries?: number;
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
    sources?: Source[];
  };
}

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
 * Function to extract column names and search queries from the assistant output
 */
function extractDatasetConfig(text: string, searchEnabled = true) {
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
 * Executes the assistant with the provided parameters
 */
export const runAssistant = async function (
  this: RequestEventBase<QwikCityPlatform>,
  params: AssistantParams,
): Promise<
  | string
  | {
      columns: string[];
      queries: string[];
      sources?: Source[];
    }
> {
  // Get the session directly from the request context
  const session = useServerSession(this);

  // Use the model name from config if none is specified
  const finalModelName = params.modelName || DEFAULT_MODEL || FALLBACK_MODEL;

  // Use the model provider directly from config
  const finalModelProvider = params.modelProvider || DEFAULT_MODEL_PROVIDER;

  console.log('🚀 [Assistant] Starting assistant execution');
  console.log('⚙️ [Assistant] Parameters:', {
    modelName: finalModelName,
    modelProvider: finalModelProvider,
    instruction:
      params.instruction.substring(0, 100) +
      (params.instruction.length > 100 ? '...' : ''),
    searchEnabled: params.searchEnabled,
    maxSearchQueries: params.maxSearchQueries,
  });

  // Log token information for debugging (safely)
  console.log('🔑 [Assistant] Token info:', {
    sessionTokenLength: session.token?.length || 0,
    sessionTokenPrefix: session.token
      ? `${session.token.substring(0, 4)}...`
      : 'none',
  });

  // Prepare the prompt
  const promptText = params.searchEnabled
    ? SEARCH_PROMPT_TEMPLATE.replace(
        '{instruction}',
        params.instruction,
      ).replace('{maxSearchQueries}', params.maxSearchQueries?.toString() || '')
    : NO_SEARCH_PROMPT_TEMPLATE.replace('{instruction}', params.instruction);

  console.log('⚙️ [Assistant] Using search enabled:', params.searchEnabled);
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
        signal: AbortSignal.timeout(params.timeout ?? INFERENCE_TIMEOUT),
      },
    );

    // Get response content, ensuring it's a non-empty string
    const responseText = response.choices[0].message.content || '';
    console.log(
      '⚙️ [Assistant] Response received:',
      responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
    );

    // Extract columns and search queries from the assistant output
    const { columns, queries } = extractDatasetConfig(
      responseText,
      params.searchEnabled,
    );

    // If no structured data found, return the original response
    if (columns.length === 0) {
      console.log(
        '⚙️ [Assistant] No columns found, returning original response',
      );
      return responseText;
    }

    // If search is not enabled, just return the columns
    if (!params.searchEnabled) {
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
    if (queries.length > 0 && params.searchEnabled) {
      console.log(
        '⚙️ [Assistant] Found search queries, performing web searches',
      );
      console.log('📊 [Assistant] Number of queries:', queries.length);
      console.log('🔍 [Assistant] Queries:', queries);

      try {
        // Collect search sources
        const sources = await collectSearchSources(queries);

        console.log('✅ [Assistant] Found', sources.length, 'total results');
        console.log(
          '📝 [Assistant] Results with content:',
          sources.filter((s) => s.content).length,
        );
        console.log(
          '🧮 [Assistant] Results with embeddings:',
          sources.filter((s) => s.chunks?.length).length,
        );

        return { columns, queries, sources };
      } catch (error) {
        console.error('❌ [Assistant] Error collecting sources:', error);
        return { columns, queries };
      }
    }

    // If no queries to search for, just return the columns and queries
    return { columns, queries };
  } catch (error) {
    console.error('❌ [Assistant] Error in assistant execution:', error);
    return error instanceof Error ? error.message : String(error);
  }
};
