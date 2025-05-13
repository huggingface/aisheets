import type { RequestEventBase } from '@builder.io/qwik-city';
import { chatCompletion } from '@huggingface/inference';
import { DEFAULT_MODEL, DEFAULT_MODEL_PROVIDER } from '~/config';
import {
  normalizeChatCompletionArgs,
  normalizeOptions,
} from '~/services/inference/run-prompt-execution';
import { createColumn, getDatasetColumns } from '~/services/repository/columns';
import { createDataset } from '~/services/repository/datasets';
import { createProcess } from '~/services/repository/processes';
import { createSourcesFromWebQueries } from '~/services/websearch/search-sources';
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

SEARCH QUERIES:
- "recent movie releases 2024 reviews"
- "popular movie genres trends analysis"
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
        process: column.process,
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
    timeout,
  }: AssistantParams,
): AsyncGenerator<{
  step: string;
  dataset?: { id: string; name: string };
  error?: string;
}> {
  // Get the session directly from the request context
  const session = useServerSession(this);

  try {
    // Extract columns and search queries from the assistant output
    yield { step: 'Configuring dataset' };

    const { datasetName, columns, queries, text } = await extractDatasetConfig({
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
      yield { step: 'Cannot process generated configuration', error: text };
      return;
    }

    yield { step: `Creating dataset ${datasetName}` };
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
      yield { step: 'Searching web sources' };
      yield* createSourcesFromWebQueries({
        dataset,
        queries,
        options: {
          accessToken: session.token,
        },
      });
    }

    yield { step: `Populating dataset ${datasetName}` };
    // Populate the dataset with generated cells
    await populateDataset(dataset, session);

    // Return the dataset and columns
    yield { step: 'Dataset created', dataset };
  } catch (error) {
    console.error('❌ [Assistant] Error in assistant execution:', error);
    return error instanceof Error ? error.message : String(error);
  }
};
