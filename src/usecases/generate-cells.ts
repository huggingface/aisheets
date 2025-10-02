import { chatCompletion } from '@huggingface/inference';
import { appConfig } from '~/config';
import { updateProcess } from '~/services';
import { cacheGet, cacheSet } from '~/services/cache';
import { MAX_SOURCE_SNIPPET_LENGTH } from '~/services/db/models/cell';
import { imageTextToTextGeneration } from '~/services/inference/image-text-to-text';
import {
  type Example,
  type MaterializePromptParams,
  renderInstruction,
} from '~/services/inference/materialize-prompt';
import {
  normalizeChatCompletionArgs,
  normalizeOptions,
  type PromptExecutionParams,
  runPromptExecution,
  runPromptExecutionStream,
} from '~/services/inference/run-prompt-execution';
import { textToImageGeneration } from '~/services/inference/text-to-image';
import {
  createCell,
  getColumnCellByIdx,
  getRowCells,
  updateCell,
} from '~/services/repository/cells';
import { countDatasetTableRows } from '~/services/repository/tables';
import { queryDatasetSources } from '~/services/websearch/embed';
import { createSourcesFromWebQueries } from '~/services/websearch/search-sources';
import type { Cell, CellSource, Column, Process, Session } from '~/state';
import { collectValidatedExamples } from './collect-examples';

export interface GenerateCellsParams {
  column: Column;
  process: Process;
  session: Session;
  limit?: number;
  offset?: number;
  validatedCells?: Cell[];
  stream?: boolean;
  updateOnly?: boolean;
  timeout?: number;
}

const MAX_CONCURRENCY = appConfig.inference.numConcurrentRequests;

function convertToUint8Array(value: any): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (typeof value === 'string') {
    const base64Data = value.replace(/^data:image\/[a-z]+;base64,/, '');
    return new Uint8Array(Buffer.from(base64Data, 'base64'));
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (value && typeof value === 'object' && 'bytes' in value) {
    if (value.bytes instanceof Uint8Array) {
      return value.bytes;
    }
    if (value.bytes instanceof ArrayBuffer) {
      return new Uint8Array(value.bytes);
    }
  }
  throw new Error('Unsupported image data format');
}

/**
 * Generates cells for a given column based on the provided parameters.
 * This function supports two modes of generation:
 * - From scratch, using a prompt and optionally streaming results.
 * - Using column references to generate cells based on existing data.
 *
 * @param {GenerateCellsParams} params - The parameters for generating cells.
 * @param {Column} params.column - The column for which cells are being generated.
 * @param {Process} params.process - The process containing metadata such as model and prompt.
 * @param {Session} params.session - The session containing authentication details.
 * @param {number} [params.limit] - The maximum number of cells to generate.
 * @param {number} [params.offset] - The starting index for cell generation.
 * @param {Cell[]} [params.validatedCells] - A list of validated cells to use as examples.
 * @param {boolean} [params.stream=true] - Whether to stream the generation results.
 * @param {boolean} [params.updateOnly=false] - Whether to only update existing cells.
 * @param {number} [params.timeout] - The timeout for the generation process in milliseconds.
 *
 * @yields {Object} - An object containing the generated or updated cell.
 * @yields {Cell} yield.cell - The cell being generated or updated.
 *
 * @throws {Error} - Throws an error if the generation process fails.
 *
 * @remarks
 * - If no column references are provided, cells are generated from scratch using the prompt.
 * - If column references are provided, cells are generated based on the referenced columns.
 * - The function ensures that the process's `updatedAt` timestamp is updated after execution.
 */
export const generateCells = async function* ({
  column,
  process,
  session,
  limit,
  offset,
  validatedCells = [],
  stream = false,
  updateOnly = false,
  timeout,
}: GenerateCellsParams) {
  const { columnsReferences } = process;

  if (!limit) {
    // Build list of input columns for size calculation
    const inputColumnIds = [
      ...(columnsReferences || []),
      ...(process.imageColumnId ? [process.imageColumnId] : []),
    ];

    // If no input columns, fall back to output column (for first column in autodatasets)
    const columnsToCheck =
      inputColumnIds.length > 0 ? inputColumnIds : [column.id];

    const columnSizes = await Promise.all(
      columnsToCheck.map((colId) => {
        return countDatasetTableRows({
          dataset: column.dataset,
          column: { id: colId },
        });
      }),
    );

    const minSize = Math.min(...columnSizes);

    limit = minSize > 0 ? minSize : 5;
  }
  if (!offset) offset = 0;

  try {
    const hasColumnReferences =
      columnsReferences && columnsReferences.length > 0;
    const isImageTextToText =
      process.task === 'image-text-to-text' && process.imageColumnId;

    if (hasColumnReferences || isImageTextToText) {
      yield* generateCellsFromColumnsReferences({
        column,
        process,
        validatedCells,
        offset,
        limit,
        updateOnly,
        timeout,
        session,
      });
    } else {
      yield* generateCellsFromScratch({
        column,
        process,
        validatedCells,
        offset,
        limit,
        stream,
        updateOnly,
        timeout,
        session,
      });
    }
  } finally {
    process.updatedAt = new Date();
    await updateProcess(process);
  }
};

async function* generateCellsFromScratch({
  column,
  process,
  validatedCells,
  offset,
  limit,
  stream,
  updateOnly,
  timeout,
  session,
}: {
  column: Column;
  process: Process;
  validatedCells: Cell[];
  offset: number;
  limit: number;
  stream: boolean;
  updateOnly: boolean;
  timeout: number | undefined;
  session: Session;
}) {
  const { modelName, modelProvider, prompt, searchEnabled, endpointUrl } =
    process;

  // Get all existing cells in the column, excluding those not validated that will
  // be regenerated
  const existingCellsExamples = column.cells
    .filter((cell) => cell.value)
    .filter(
      (cell) =>
        cell.validated || !(cell.idx >= offset && cell.idx < offset + limit),
    )
    .map((cell) => ({
      output: cell.value,
      validated: cell.validated,
      inputs: {},
    }));

  let sourcesContext:
    | {
        text: string;
        source_uri: string;
        score?: number;
      }[]
    | undefined;

  const sourcesLimit = Math.max(30, (limit + existingCellsExamples.length) * 2);

  if (searchEnabled) {
    // 1. Build web search query from prompt
    const queries = await buildWebSearchQueries({
      prompt,
      column,
      options: {
        accessToken: session.token,
      },
      maxQueries: 1,
    });

    // 2. Index web search results into the embbedding store
    if (queries.length > 0) {
      await createSourcesFromWebQueries({
        dataset: column.dataset,
        queries,
        options: {
          accessToken: session.token,
        },
        maxSources: 2,
      });
    }

    // 3. Search for relevant results
    sourcesContext = await queryDatasetSources({
      dataset: column.dataset,
      query: queries[0],
      options: {
        accessToken: session.token,
      },
      limit: sourcesLimit,
    });
  }

  // Extract sources (url + snippet) if available
  const sources = sourcesContext
    ? sourcesContext.map((source) => ({
        url: source.source_uri,
        snippet: source.text?.slice(0, MAX_SOURCE_SNIPPET_LENGTH) || '',
      }))
    : undefined;

  const validatedIdxs = validatedCells?.map((cell) => cell.idx);

  for (let i = offset; i < limit + offset; i++) {
    if (validatedIdxs?.includes(i)) continue;

    const cell = await (updateOnly
      ? getColumnCellByIdx({ idx: i, columnId: column.id })
      : getOrCreateCellInDB(column.id, i));

    if (!cell) continue;

    cell.generating = true;
    yield { cell };

    const args = {
      accessToken: session.token,
      modelName,
      modelProvider,
      endpointUrl,
      examples: existingCellsExamples,
      instruction: prompt,
      sourcesContext,
      timeout,
      data: {},
    };

    if (stream) {
      for await (const response of runPromptExecutionStream(args)) {
        cell.value = response.value;
        cell.error = response.error;
        yield { cell };
      }
    } else {
      const response = await runPromptExecution(args);
      cell.value = response.value;
      cell.error = response.error;
    }

    cell.generating = false;
    // Add sources only after successful generation
    if (cell.value && !cell.error) cell.sources = sources;

    await updateCell(cell);

    yield { cell };

    // Add this newly generated cell to our collection if it's valid
    if (cell.value && !cell.error) {
      // Recollect examples using ALL validated and generated cells
      existingCellsExamples.push({
        output: cell.value,
        validated: false,
        inputs: {},
      });
    }
  }
}

async function singleCellGeneration({
  cell,
  column,
  process,
  examples,
  rowIdx,
  session,
  timeout,
}: {
  cell: Cell;
  column: Column;
  process: Process;
  examples?: Example[];
  rowIdx: number;
  session: Session;
  timeout: number | undefined;
}): Promise<{
  cell: Cell;
}> {
  const {
    columnsReferences,
    modelName,
    modelProvider,
    prompt,
    searchEnabled,
    endpointUrl,
  } = process;

  const rowCells = await getRowCells({
    rowIdx,
    columns: columnsReferences || [],
  });

  // Only check for empty data if we have column references
  // For custom text generation without column references, this check should be skipped
  if (
    columnsReferences &&
    columnsReferences.length > 0 &&
    rowCells?.filter((cell) => cell.value).length === 0
  ) {
    cell.generating = false;
    cell.error = 'No input data found';

    await updateCell(cell);

    return { cell };
  }

  const data =
    rowCells && rowCells.length > 0
      ? Object.fromEntries(
          rowCells.map((cell) => [cell.column!.name, cell.value]),
        )
      : {};

  const args: PromptExecutionParams = {
    accessToken: session.token,
    modelName,
    modelProvider,
    endpointUrl,
    examples,
    instruction: prompt,
    timeout,
    data,
    idx: rowIdx,
    task: process.task,
  };

  switch (process.task) {
    case 'text-to-image': {
      const response = await generateImage({
        prompt,
        args,
        session,
      });

      cell.value = response.value;
      cell.error = response.error;
      cell.generating = false;

      break;
    }
    case 'image-text-to-text': {
      const response = await generateImageTextToText({
        prompt,
        args,
        session,
        process,
      });

      cell.value = response.value;
      cell.error = response.error;
      cell.generating = false;
      if (cell.value && !cell.error) cell.sources = response.sources;

      break;
    }
    default: {
      const response = await _generateText({
        column,
        prompt,
        args,
        searchEnabled,
        session,
      });

      cell.value = response.value;
      cell.error = response.error;
      cell.generating = false;
      if (cell.value && !cell.error) cell.sources = response.sources;

      break;
    }
  }

  await updateCell(cell);

  return { cell };
}

async function* cellGenerationInBatch({
  cells,
  column,
  process,
  examples,
  session,
  timeout,
}: {
  cells: Cell[];
  column: Column;
  process: Process;
  examples?: Example[];
  session: Session;
  timeout: number | undefined;
}) {
  for (let i = 0; i < cells.length; i += MAX_CONCURRENCY) {
    const batch = cells.slice(i, i + MAX_CONCURRENCY);

    for (const cell of batch) {
      cell.generating = true;
      yield { cell };
    }

    // Prepare an array of promises, each with its cell index
    const pending = batch.map((cell, idx) =>
      singleCellGeneration({
        cell,
        column,
        process,
        examples,
        rowIdx: cell.idx,
        session,
        timeout,
      }).then((result) => ({ result, idx })),
    );

    // As soon as a promise resolves, yield its result and replace it with the
    // next pending one (if any)
    let remaining = pending.length;
    const yielded = new Set<number>();

    while (remaining > 0) {
      const { result, idx } = await Promise.race(
        pending.filter((_, i) => !yielded.has(i)),
      );

      yielded.add(idx);

      yield { cell: result.cell };
      remaining--;
    }
  }
}

async function* generateCellsFromColumnsReferences({
  column,
  process,
  validatedCells,
  offset,
  limit,
  updateOnly,
  timeout,
  session,
}: {
  column: Column;
  process: Process;
  validatedCells: Cell[];
  offset: number;
  limit: number;
  updateOnly: boolean;
  timeout: number | undefined;
  session: Session;
}) {
  // Set generating state for all cells upfront
  const validatedIdxs = validatedCells?.map((cell) => cell.idx);

  // Get initial examples from validated cells
  const currentExamples = await collectValidatedExamples({
    validatedCells,
    columnsReferences: process.columnsReferences,
  });

  for (let i = offset; i < limit + offset; i += MAX_CONCURRENCY) {
    const batch: Cell[] = [];
    for (let j = i; j < Math.min(i + MAX_CONCURRENCY, limit + offset); j++) {
      if (validatedIdxs?.includes(j)) continue;
      const cell = await (updateOnly
        ? getColumnCellByIdx({ idx: j, columnId: column.id })
        : getOrCreateCellInDB(column.id, j));
      if (cell) batch.push(cell);
    }
    for await (const { cell } of cellGenerationInBatch({
      cells: batch,
      column,
      examples: currentExamples,
      process,
      session,
      timeout,
    })) {
      yield { cell };
    }
  }
}

const getOrCreateCellInDB = async (
  columnId: string,
  idx: number,
): Promise<Cell> => {
  let cell = await getColumnCellByIdx({ idx, columnId });

  if (!cell?.id) {
    cell = await createCell({
      cell: { idx },
      columnId,
    });
  }

  return cell;
};

const SEARCH_QUERIES_PROMPT_TEMPLATE = `
Given this prompt that will be used to generate a cell in a column of the dataset named "{datasetName}":

{prompt}

Create exactly {maxQueries} specific optimized Google search queries that will help gather relevant, accurate, and specific information for this prompt. The queries should be focused on finding information that would help generate high-quality content for this specific cell, taking into account the context of the dataset.
Avoid using irrelevant adjectives (e.g., notable, best, etc.) unless explicitly specified in the prompt.

Your response must follow this exact format:

SEARCH QUERIES:
- "specific search query 1"
- "specific search query 2"

Make sure the queries are specific and relevant to both the prompt and the dataset context. Avoid generic queries.
`.trim();

async function buildWebSearchQueries({
  prompt,
  column,
  options,
  maxQueries = 1,
}: {
  prompt: string;
  column: Column;
  options: { accessToken: string };
  maxQueries?: number;
}): Promise<string[]> {
  const {
    inference: {
      tasks: { textGeneration },
    },
  } = appConfig;

  // TODO: Review custom config in case we want to use a specific model for
  // this task
  const {
    modelName = textGeneration.defaultModel,
    modelProvider = textGeneration.defaultProvider,
  } = column.process || {};

  try {
    const promptText = SEARCH_QUERIES_PROMPT_TEMPLATE.replace(
      '{prompt}',
      prompt,
    )
      .replace('{maxQueries}', maxQueries.toString())
      .replace('{datasetName}', column.dataset.name);

    const cacheKey = promptText;

    const cachedResult = cacheGet(cacheKey);
    if (cachedResult) return cachedResult.slice(0, maxQueries);

    const response = await chatCompletion(
      normalizeChatCompletionArgs({
        messages: [{ role: 'user', content: promptText }],
        modelName,
        modelProvider,
        accessToken: options.accessToken,
      }),
      normalizeOptions(),
    );

    const responseText = response.choices[0].message.content || '';

    // Extract queries using regex similar to extractDatasetConfig
    const queries: string[] = [];
    const regex = /^["'](.+)["']$/;

    // Process all lines to extract queries
    for (const line of responseText.split('\n').map((l) => l.trim())) {
      if (line.startsWith('-')) {
        const item = line.substring(1).trim();
        const quotedMatch = item.match(regex);
        const query = quotedMatch ? quotedMatch[1] : item;
        if (query) {
          queries.push(query);
        }
      }
    }

    if (queries.length === 0) {
      console.warn(
        '⚠️ [buildWebSearchQueries] No valid search queries found in the response.',
      );
      return [];
    }

    cacheSet(cacheKey, queries);

    return queries.slice(0, maxQueries);
  } catch (error) {
    console.error(
      '❌ [buildWebSearchQueries] Error generating search queries:',
      error,
    );
    return [];
  }
}

const _generateText = async ({
  column,
  prompt,
  args,
  searchEnabled,
  session,
}: {
  column: Column;
  prompt: string;
  args: PromptExecutionParams;
  searchEnabled: boolean;
  session: Session;
}): Promise<{
  value?: string;
  error?: string;
  sources?: { url: string; snippet: string }[];
}> => {
  let sourcesContext: MaterializePromptParams['sourcesContext'];

  if (searchEnabled) {
    const renderedInstruction = renderInstruction(prompt, args.data);

    const queries = await buildWebSearchQueries({
      prompt: renderedInstruction,
      column,
      options: {
        accessToken: session.token,
      },
      maxQueries: 1,
    });

    if (queries.length > 0) {
      // 2. Index web search results into the embbedding store
      await createSourcesFromWebQueries({
        dataset: column.dataset,
        queries,
        options: {
          accessToken: session.token,
        },
        maxSources: 2,
      });
    }

    // 3. Search for relevant results
    sourcesContext = await queryDatasetSources({
      dataset: column.dataset,
      query: queries[0],
      options: {
        accessToken: session.token,
      },
      limit: 15,
    });

    args.sourcesContext = sourcesContext;
  }

  const response = await runPromptExecution({
    ...args,
    task: args.task,
  });

  // Extract sources (url + snippet) if available
  const sources = sourcesContext
    ? sourcesContext.map((source) => ({
        url: source.source_uri,
        snippet: source.text?.slice(0, MAX_SOURCE_SNIPPET_LENGTH) || '',
      }))
    : undefined;

  return { ...response, sources };
};

const generateImage = async ({
  prompt,
  args,
  session,
}: {
  prompt: string;
  args: PromptExecutionParams;
  session: Session;
}): Promise<{
  value?: ArrayBuffer;
  error?: string;
}> => {
  // For image generation, we can use the same runPromptExecution function
  // but we need to ensure that the model supports image generation.
  const response = await textToImageGeneration({
    ...args,
    instruction: prompt,
    accessToken: session.token,
  });

  return {
    value: response.value ?? undefined,
    error: response.error,
  };
};

const generateImageTextToText = async ({
  prompt,
  args,
  session,
  process,
}: {
  prompt: string;
  args: PromptExecutionParams;
  session: Session;
  process: Process;
}): Promise<{
  value?: string;
  error?: string;
  sources?: CellSource[];
}> => {
  // Get the image column ID from the process
  const imageColumnId = process.imageColumnId;

  if (!imageColumnId) {
    return {
      error: 'No image column selected for image-text-to-text processing',
    };
  }

  // Get the image data from the selected image column
  const imageCell = await getColumnCellByIdx({
    columnId: imageColumnId,
    idx: args.idx || 0,
  });

  if (!imageCell || !imageCell.value) {
    return {
      error: 'No image data found in the selected image column',
    };
  }

  // Convert image data to Uint8Array if it's not already
  let imageData: Uint8Array;

  try {
    imageData = convertToUint8Array(imageCell.value);
  } catch (_error) {
    return {
      error: 'Unsupported image data format',
    };
  }

  // Generate text from image using the image-text-to-text service
  const response = await imageTextToTextGeneration({
    ...args,
    instruction: prompt,
    imageData,
    accessToken: session.token,
  });

  // For now, we don't support web search for image-text-to-text
  // but we could add it in the future if needed
  const sources: CellSource[] = [];

  return {
    value: response.value,
    error: response.error,
    sources,
  };
};
