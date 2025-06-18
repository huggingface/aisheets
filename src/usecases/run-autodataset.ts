import type { RequestEventBase } from '@builder.io/qwik-city';
import { chatCompletion } from '@huggingface/inference';
import {
  DEFAULT_MODEL,
  DEFAULT_MODEL_PROVIDER,
  MODEL_ENDPOINT_URL,
} from '~/config';
import {
  normalizeChatCompletionArgs,
  normalizeOptions,
} from '~/services/inference/run-prompt-execution';
import { createColumn, getDatasetColumns } from '~/services/repository/columns';
import { createDataset } from '~/services/repository/datasets';
import { createProcess } from '~/services/repository/processes';
import { indexDatasetSources } from '~/services/websearch/embed';
import { scrapeUrlsBatch } from '~/services/websearch/scrape';
import {
  type Source,
  searchQueriesToSources,
} from '~/services/websearch/search-sources';
import type { Column, Session } from '~/state';
import type { ColumnKind } from '~/state/columns';
import { useServerSession } from '~/state/session';
import { generateCells } from './generate-cells';

export interface AssistantParams {
  accessToken?: string;
  modelName?: string;
  modelProvider?: string;
  instruction: string;
  searchEnabled?: boolean;
  timeout?: number;
  maxSearchQueries?: number;
  maxSources?: number;
}

export interface WebSearchQuery {
  column: string;
  query: string;
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
- column_name1 : prompt1 (this first column is always the main object and the only one not referencing other columns). This colum should generate a single value. For listing items avoid using words like Describe, Generate, etc. and instead use: Identify one, Extract one, Name one etc.
- column_name2 : prompt2 (referencing {{column_name}} if needed)
- column_name3 : prompt3...

SEARCH QUERIES:
- "specific search query 1"
- "specific search query 2"

Only include columns that are directly relevant to the request. Create exactly {maxSearchQueries} specific search queries that will help gather initial information, especially for the first column of the dataset. Don't use adjectives for the search query (e.g., "best") unless they are included in the user instruction. Make the query as simple and effective as possible, don't try to request the info for all columns in the query, it's just a starting point, later more webs will be retrieved for specific columns.

Avoid adding columns with typical database things, like tweet_id, id, timestamp, etc.

Limit the number of columns to maximum 3 unless it's strictly required or the user specifies the columns themselves.

ALWAYS include a prompt for each column.

Here is a high-quality example of dataset configurations:

USER REQUEST:
recent movie reviews by genre

DATASET NAME:
Recent Movie Reviews Collection

COLUMNS:
- movie_title : Identify one movie title from the provided sources.
- reviews : Summarize the moview review for {{movie_title}} based on the provided sources.
- genre : Identify the movie genre of {{movie_title}} based on the provided sources.

SEARCH QUERIES:
- "recent movie releases"
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

Limit the number of columns to maximum 3 unless it's strictly required or the user specifies the columns themselves.

Here are some high-quality examples of dataset configurations:

DATASET NAME:
Modern Movie Reviews Collection

COLUMNS:
- movie_title : Generate a movie title in the style of recent releases
- review : Write a detailed movie review for {{movie_title}}
- rating : Rate {{movie_title}} from 1-5 stars based on {{review}}
- genre : Identify the movie genre based on {{review}}
`.trim();

/**
 * Extracts structured dataset configuration from LLM output
 */
async function extractDatasetConfig({
  instruction,
  modelName,
  modelProvider,
  maxSearchQueries = 1,
  searchEnabled = false,
  session,
  timeout,
}: {
  instruction: string;
  searchEnabled?: boolean;
  maxSearchQueries?: number;
  modelName: string;
  modelProvider: string;
  session: Session;
  timeout?: number;
}) {
  // Define result structure with defaults
  const result: any = {
    datasetName: 'Auto-generated Dataset',
    columns: [] as Array<{ name: string; prompt: string }>,
    queries: [] as string[],
  };

  // Define regex patterns for better maintainability
  const sectionPatterns = {
    name: /^DATASET NAME:$/i,
    columns: /^COLUMNS:$/i,
    queries: /^SEARCH QUERIES:$/i,
    bulletPoint: /^\s*-\s+(.+)$/,
    quotedText: /^["'](.+)["']$/,
  };

  let currentSection: keyof typeof sectionPatterns | null = null;

  const promptText = searchEnabled
    ? SEARCH_PROMPT_TEMPLATE.replace('{instruction}', instruction).replace(
        '{maxSearchQueries}',
        maxSearchQueries?.toString() || '',
      )
    : NO_SEARCH_PROMPT_TEMPLATE.replace('{instruction}', instruction);

  const response = await chatCompletion(
    normalizeChatCompletionArgs({
      messages: [{ role: 'user', content: promptText }],
      modelName,
      modelProvider,
      accessToken: session.token,
      endpointUrl: MODEL_ENDPOINT_URL,
    }),
    normalizeOptions(timeout),
  );

  const text = response.choices[0].message.content || '';
  result.text = text;

  // Process text line by line
  for (const line of text.split('\n').map((l) => l.trim())) {
    // Skip empty lines
    if (!line) continue;

    // Check for section headers
    if (sectionPatterns.name.test(line)) {
      currentSection = 'name';
      continue;
    }

    if (sectionPatterns.columns.test(line)) {
      currentSection = 'columns';
      continue;
    }

    if (searchEnabled && sectionPatterns.queries.test(line)) {
      currentSection = 'queries';
      continue;
    }

    // Skip if no section identified yet
    if (!currentSection) continue;

    // Process dataset name
    if (currentSection === 'name') {
      result.datasetName = line;
      continue;
    }

    // Process bulleted items
    const bulletMatch = line.match(sectionPatterns.bulletPoint);
    if (!bulletMatch) continue;

    const item = bulletMatch[1].trim();

    // Handle columns section
    if (currentSection === 'columns') {
      const colonIndex = item.indexOf(':');

      // Skip malformed entries
      if (colonIndex === -1) continue;

      const columnName = item.substring(0, colonIndex).trim();
      const prompt = item.substring(colonIndex + 1).trim();

      if (columnName) {
        result.columns.push({ name: columnName, prompt });
      }
    }

    // Handle queries section
    if (searchEnabled && currentSection === 'queries') {
      const quotedMatch = item.match(sectionPatterns.quotedText);
      const query = quotedMatch ? quotedMatch[1] : item;

      if (query) {
        result.queries.push(query);
      }
    }
  }

  return result;
}

/**
 * Creates a dataset with the suggested columns from the assistant
 */
async function createDatasetWithColumns(
  columns: Array<{ name: string; prompt: string }>,
  session: Session,
  modelName: string = DEFAULT_MODEL,
  modelProvider: string = DEFAULT_MODEL_PROVIDER,
  datasetName = 'New Dataset',
  searchEnabled = false,
) {
  // Create the dataset
  const dataset = await createDataset({
    name: datasetName,
    createdBy: session.user.username,
  });

  // Create all columns first
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

  // Create processes for each column with correct references
  const columnNames = columns.map((col) => col.name);
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const createdColumn = createdColumns[i];

    const columnReferences = extractColumnReferences(
      column.prompt,
      columnNames,
    );

    const process = await createProcess({
      process: {
        modelName,
        modelProvider,
        prompt: column.prompt,
        searchEnabled,
        columnsReferences: columnReferences.map((ref) => {
          const refIndex = columnNames.indexOf(ref);
          return createdColumns[refIndex].id;
        }),
      },
      column: { id: createdColumn.id },
    });

    createdColumn.process = process;
  }

  return {
    dataset,
    columns: createdColumns.map((col) => ({
      name: col.name,
      prompt:
        col.process?.prompt ||
        columns.find((c) => c.name === col.name)?.prompt ||
        '',
    })),
    createdColumns,
  };
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

async function populateDataset(
  dataset: { id: string; name: string },
  session: Session,
) {
  try {
    // Get the full column objects with processes
    const columns = await getDatasetColumns(dataset);

    // Generate cells for each column synchronously
    for (const column of columns) {
      if (!column.process) continue;

      for await (const _ of generateCells({
        column,
        process: {
          ...column.process,
          useEndpointURL: MODEL_ENDPOINT_URL !== undefined,
        },
        session,
        offset: 0,
        limit: 5,
      })) {
        // We don't need to do anything with the yielded cells
      }
    }
  } catch (error) {
    console.error('❌ [PopulateDataset] Error populating dataset:', error);
    throw error;
  }
}

interface Event {
  event: string;
  data?: any;
  error?: any;
}

const EVENTS = {
  datasetConfig: 'dataset.config',
  datasetConfigError: 'dataset.config.error',

  datasetCreate: 'dataset.create',
  datasetCreateSuccess: 'dataset.create.success',
  datasetCreateError: 'dataset.create.error',

  datasetSearch: 'dataset.search',
  datasetSearchSuccess: 'dataset.search.success',
  datasetSearchError: 'dataset.search.error',

  datasetPopulate: 'dataset.populate',
  datasetPopulateSuccess: 'dataset.populate.success',
  datasetPopulateError: 'dataset.populate.error',

  sourcesProcess: 'sources.process',

  sourceCompleted: 'source.process.completed',

  sourceIndex: 'sources.index',
  sourceIndexSuccess: 'sources.index.success',
  sourceIndexError: 'sources.index.error',

  genericError: 'generic.error',
};

async function* createSourcesFromWebQueries({
  dataset,
  queries,
  options,
  maxSources = 5,
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
}): AsyncGenerator<Event> {
  const { sources: webSources, errors } = await searchQueriesToSources(
    queries,
    maxSources,
  );

  yield {
    event: EVENTS.datasetSearchSuccess,
    data: { sources: webSources, errors },
  };

  yield {
    event: EVENTS.sourcesProcess,
    data: { urls: webSources.map((source) => source.url) },
  };

  const scrappedUrls = new Map<string, Source>();
  for await (const { url, result } of scrapeUrlsBatch(
    webSources.map((source) => source.url),
  )) {
    if (!result) {
      yield {
        event: EVENTS.sourceCompleted,
        data: { url, ok: false },
      };
      continue;
    }

    yield {
      event: EVENTS.sourceCompleted,
      data: { url, ok: true },
    };
    scrappedUrls.set(url, result);
  }

  const sources = webSources
    .map((source) => {
      const { url } = source;
      const scrapped = scrappedUrls.get(url);

      if (scrapped) source.markdownTree = scrapped.markdownTree;
      return source;
    })
    .filter(({ markdownTree }) => markdownTree);

  yield {
    event: EVENTS.sourceIndex,
    data: { urls: sources.map((source) => source.url) },
  };

  const indexedChunks = await indexDatasetSources({
    dataset,
    sources: sources,
    options,
  });

  if (indexedChunks <= 0) {
    yield {
      event: EVENTS.sourceIndexError,
      data: { error: 'No chunks indexed' },
    };
    return;
  }

  yield {
    event: EVENTS.sourceIndexSuccess,
    data: { count: indexedChunks },
  };
}

/**
 * Executes the assistant with the provided parameters
 */
export const runAutoDataset = async function* (
  this: RequestEventBase<QwikCityPlatform>,
  {
    instruction,
    modelName = DEFAULT_MODEL,
    modelProvider = DEFAULT_MODEL_PROVIDER,
    searchEnabled = false,
    maxSearchQueries = 1,
    maxSources = 5,
    timeout,
  }: AssistantParams,
): AsyncGenerator<Event> {
  // Get the session directly from the request context
  const session = useServerSession(this);

  try {
    // Extract columns and search queries from the assistant output
    yield { event: EVENTS.datasetConfig };

    const { datasetName, columns, queries } = await extractDatasetConfig({
      instruction,
      modelName,
      modelProvider,
      maxSearchQueries,
      searchEnabled,
      timeout,
      session,
    });

    // If no structured data found, return the original response
    if (columns.length === 0) {
      yield {
        event: EVENTS.datasetConfigError,
        error: 'No structured data found in the assistant response',
      };
      return;
    }

    yield {
      event: EVENTS.datasetCreate,
      data: { name: datasetName },
    };

    // Step 1: Create dataset and columns
    const { dataset } = await createDatasetWithColumns(
      columns,
      session,
      modelName,
      modelProvider,
      datasetName,
      searchEnabled,
    );

    if (queries && queries.length > 0) {
      yield {
        event: EVENTS.datasetSearch,
        data: { queries },
      };

      yield* createSourcesFromWebQueries({
        dataset,
        queries,
        options: {
          accessToken: session.token,
        },
        maxSources,
      });
    }

    // Populate the dataset with generated cells
    yield {
      event: EVENTS.datasetPopulate,
      data: { dataset },
    };
    await populateDataset(dataset, session);

    // Return the dataset and columns
    yield {
      event: EVENTS.datasetPopulateSuccess,
      data: { dataset },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    yield {
      event: EVENTS.genericError,
      error: message,
    };
  }
};
