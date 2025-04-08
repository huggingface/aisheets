import type { RequestEventBase } from '@builder.io/qwik-city';
import { type InferenceProvider, chatCompletion } from '@huggingface/inference';
import {
  DEFAULT_MODEL,
  DEFAULT_MODEL_PROVIDER,
  INFERENCE_TIMEOUT,
} from '~/config';
import { createColumn } from '~/services/repository/columns';
import { createDataset } from '~/services/repository/datasets';
import { createProcess } from '~/services/repository/processes';
import {
  type Source,
  collectSearchSources,
} from '~/services/websearch/search-sources';
import type { Column } from '~/state';
import { useServerSession } from '~/state';
import type { ColumnKind } from '~/state/columns';

/**
 * Default model to use when none is specified (or when config is empty)
 */
const FALLBACK_MODEL = 'meta-llama/Llama-3.3-70B-Instruct';

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

First, provide a short, descriptive name for this dataset (2-5 words).

Then, identify the main columns needed for this dataset.

Second, identify the prompts that would be needed to generate each cell in the column. For example, if the column is tweet, and the tweet is about a specific topic, event, or action, write: Tweet about X. If a column is related to another column, reference it using {{column_name}} in the prompt.

Then, create specific search queries that will help gather information for the entire dataset.

Your response must follow this exact format:

DATASET NAME:
Short Descriptive Name

COLUMNS:
- column_name1 : prompt1 (this first column is always the main object and the only one not referencing other columns)
- column_name2 : prompt2 (referencing {{column_name}} if needed)
- column_name3 : prompt3...

SEARCH QUERIES:
- "specific search query 1"
- "specific search query 2"

Only include columns that are directly relevant to the request. Create exactly {maxSearchQueries} specific search queries that will help gather comprehensive information for all columns.

Avoid adding columns with typical database things, like tweet_id, id, timestamp, etc.

ALWAYS include a prompt for each column.

Here are some high-quality examples of dataset configurations:

DATASET NAME:
Modern Movie Reviews Collection

COLUMNS:
- movie_title : Generate a movie title in the style of recent releases
- review : Write a detailed movie review for {{movie_title}}
- rating : Rate {{movie_title}} from 1-5 stars based on {{review}}
- genre : Identify the movie genre based on {{review}}

DATASET NAME:
Tech Product Catalog

COLUMNS:
- product_name : Generate a name for a tech gadget or device
- description : Write a detailed product description for {{product_name}}
- features : List key technical features of {{product_name}} based on {{description}}
- target_audience : Identify the target audience for {{product_name}} based on {{description}}

DATASET NAME:
Restaurant Reviews Dataset

COLUMNS:
- restaurant : Generate a creative restaurant name
- cuisine_type : Specify the type of cuisine for {{restaurant}}
- review : Write a detailed food review for {{restaurant}} considering {{cuisine_type}}
- price_range : Determine price range ($-$$$$) based on {{review}}

SEARCH QUERIES:
- "recent movie releases 2024 reviews"
- "popular movie genres trends analysis"

COLUMNS:
- product_name : Generate a name for a tech gadget or device
- description : Write a detailed product description for {{product_name}}
- features : List key technical features of {{product_name}} based on {{description}}
- target_audience : Identify the target audience for {{product_name}} based on {{description}}

SEARCH QUERIES:
- "latest technology gadgets innovations 2024"
- "consumer electronics market trends"

SEARCH QUERIES:
- "popular restaurant concepts 2024"
- "food industry trends by cuisine"

`.trim();

/**
 * Template for the prompt when search is disabled
 */
const NO_SEARCH_PROMPT_TEMPLATE = `
Given this request: 

{instruction}

First, provide a short, descriptive name for this dataset (2-5 words).

Then, identify the main columns needed for this dataset.

Your response must follow this exact format:

DATASET NAME:
Short Descriptive Name

COLUMNS:
- column_name1 : prompt1 (this first column is always the main object and the only one not referencing other columns)
- column_name2 : prompt2 (referencing {{column_name}} if needed)
- column_name3 : prompt3...

Only include columns that are directly relevant to the request.

Avoid adding columns with typical database things, like tweet_id, id, timestamp, etc.

Here are some high-quality examples of dataset configurations:

DATASET NAME:
Modern Movie Reviews Collection

COLUMNS:
- movie_title : Generate a movie title in the style of recent releases
- review : Write a detailed movie review for {{movie_title}}
- rating : Rate {{movie_title}} from 1-5 stars based on {{review}}
- genre : Identify the movie genre based on {{review}}

DATASET NAME:
Tech Product Catalog

COLUMNS:
- product_name : Generate a name for a tech gadget or device
- description : Write a detailed product description for {{product_name}}
- features : List key technical features of {{product_name}} based on {{description}}
- target_audience : Identify the target audience for {{product_name}} based on {{description}}

DATASET NAME:
Restaurant Reviews Dataset

COLUMNS:
- restaurant : Generate a creative restaurant name
- cuisine_type : Specify the type of cuisine for {{restaurant}}
- review : Write a detailed food review for {{restaurant}} considering {{cuisine_type}}
- price_range : Determine price range ($-$$$$) based on {{review}}

COLUMNS:

`.trim();

/**
 * Function to extract column names and search queries from the assistant output
 */
function extractDatasetConfig(text: string, searchEnabled = true) {
  console.log('⚙️ [Assistant] Extracting results from text:', text);

  // Change the columns array to store objects with name and prompt
  const columns: Array<{ name: string; prompt: string }> = [];
  const queries: string[] = [];
  let datasetName = 'Auto-generated Dataset';

  let currentSection: 'name' | 'columns' | 'queries' | null = null;
  const lines = text.split('\n');

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Check if line defines a section
    if (line.match(/^DATASET NAME:$/i)) {
      currentSection = 'name';
      console.log('⚙️ [Assistant] Found DATASET NAME section');
      continue;
    }

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

    if (currentSection === 'name' && line.trim()) {
      datasetName = line.trim();
      console.log('⚙️ [Assistant] Found dataset name:', datasetName);
      continue;
    }

    // Extract bulleted items
    const bulletMatch = line.match(/^\s*-\s+(.+)$/);
    if (bulletMatch) {
      const item = bulletMatch[1].trim();

      if (currentSection === 'columns') {
        // Split the column line into name and prompt using the colon
        const [columnName, ...promptParts] = item
          .split(':')
          .map((part) => part.trim());
        if (columnName) {
          columns.push({
            name: columnName,
            // Join prompt parts back together in case the prompt itself contained colons
            prompt: promptParts.join(':') || '',
          });
          console.log('⚙️ [Assistant] Added column:', {
            name: columnName,
            prompt: promptParts.join(':') || '',
          });
        }
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

  console.log('⚙️ [Assistant] Extracted dataset name:', datasetName);
  console.log('⚙️ [Assistant] Extracted columns:', columns);
  if (searchEnabled) {
    console.log('⚙️ [Assistant] Extracted queries:', queries);
  }

  return { datasetName, columns, queries };
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
      columns: Array<{ name: string; prompt: string }>;
      queries: string[];
      sources?: Source[];
      dataset: string;
      createdColumns: Array<{ name: string; prompt: string }>;
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
    console.log('📝 [Assistant] Raw LLM response:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(responseText);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      '⚙️ [Assistant] Response received:',
      responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
    );

    // Extract columns and search queries from the assistant output
    const { datasetName, columns, queries } = extractDatasetConfig(
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

    // Create the dataset with the suggested columns
    const { dataset, columns: createdColumns } = await createAutoDataset(
      columns,
      session,
      finalModelName,
      finalModelProvider,
      datasetName,
    );

    // If search is not enabled, just return the columns and dataset
    if (!params.searchEnabled) {
      console.log(
        '⚙️ [Assistant] Search not enabled, returning columns and dataset',
      );
      return { columns, queries: [], dataset, createdColumns };
    }

    // If search is enabled but no queries found, return just the columns and dataset
    if (queries.length === 0) {
      console.log(
        '⚙️ [Assistant] No search queries found, returning columns and dataset',
      );
      return { columns, queries: [], dataset, createdColumns };
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

        return { columns, queries, sources, dataset, createdColumns };
      } catch (error) {
        console.error('❌ [Assistant] Error collecting sources:', error);
        return { columns, queries, dataset, createdColumns };
      }
    }

    // If no queries to search for, just return the columns, queries, and dataset
    return { columns, queries, dataset, createdColumns };
  } catch (error) {
    console.error('❌ [Assistant] Error in assistant execution:', error);
    return error instanceof Error ? error.message : String(error);
  }
};

export interface AssistantResult {
  columns?: Array<{ name: string; prompt: string }>;
  queries?: string[];
  sources?: Source[];
  dataset?: string;
  createdColumns?: Array<{ name: string; prompt: string }>;
  logs?: string[];
}

/**
 * Extracts column references from a prompt using the {{column_name}} syntax
 */
function extractColumnReferences(
  prompt: string,
  availableColumns: string[],
): string[] {
  const references: string[] = [];
  const regex = /{{([^}]+)}}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(prompt)) !== null) {
    const columnName = match[1].trim();
    if (availableColumns.includes(columnName)) {
      references.push(columnName);
    }
  }

  return references;
}

/**
 * Creates a dataset with the suggested columns from the assistant
 */
async function createAutoDataset(
  columns: Array<{ name: string; prompt: string }>,
  session: { user: { username: string } },
  modelName: string = DEFAULT_MODEL,
  modelProvider: string = DEFAULT_MODEL_PROVIDER,
  datasetName = 'Auto-generated Dataset',
) {
  // 1. Create the dataset
  const dataset = await createDataset({
    name: datasetName,
    createdBy: session.user.username,
  });

  // 2. Create all columns first
  const createdColumns: Column[] = [];
  for (const column of columns) {
    const newColumn = await createColumn({
      name: column.name,
      type: 'VARCHAR',
      kind: 'dynamic' as ColumnKind,
      dataset,
    });
    createdColumns.push(newColumn);
  }

  // 3. Create processes for each column with correct references
  const columnNames = columns.map((col) => col.name);
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const createdColumn = createdColumns[i];

    // Extract column references from the prompt
    const columnReferences = extractColumnReferences(
      column.prompt,
      columnNames,
    );

    // Create process with references to actual column IDs
    const process = await createProcess({
      process: {
        modelName,
        modelProvider,
        prompt: column.prompt,
        columnsReferences: columnReferences.map((ref) => {
          const refIndex = columnNames.indexOf(ref);
          return createdColumns[refIndex].id;
        }),
        offset: 0,
        limit: 5,
      },
      column: { id: createdColumn.id },
    });

    // Update the column with the process
    createdColumn.process = process;
  }

  return {
    dataset: dataset.id,
    columns: createdColumns.map((col) => ({
      name: col.name,
      prompt:
        col.process?.prompt ||
        columns.find((c) => c.name === col.name)?.prompt ||
        '',
    })),
  };
}
