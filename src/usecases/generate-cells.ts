import { getMaxRowIdxByColumnId, updateProcess } from '~/services';
import { renderInstruction } from '~/services/inference/materialize-prompt';
import {
  type PromptExecutionParams,
  runPromptExecution,
  runPromptExecutionStream,
  runPromptExecutionStreamBatch,
} from '~/services/inference/run-prompt-execution';
import {
  createCell,
  getColumnCellByIdx,
  getRowCells,
  updateCell,
} from '~/services/repository/cells';
import { queryDatasetSources } from '~/services/websearch/embed';
import { createSourcesFromWebQueries } from '~/services/websearch/search-sources';
import type { Cell, Column, Process, Session } from '~/state';
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
  stream = true,
  updateOnly = false,
  timeout,
}: GenerateCellsParams) {
  const { columnsReferences } = process;

  if (!limit) limit = (await getMaxRowIdxByColumnId(column.id)) + 1;
  if (!offset) offset = 0;

  try {
    if (!columnsReferences?.length) {
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
    } else {
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
  const { modelName, modelProvider, prompt, searchEnabled } = process;

  let sourcesContext = undefined;
  if (searchEnabled) {
    // TODO:
    // 1. Build web search query from prompt
    const queries = await buildWebSearchQueries({
      prompt,
      column,
      options: {
        accessToken: session.token,
      },
    });

    // 2. Index web search results into the embbedding store
    if (queries.length > 0) {
      await createSourcesFromWebQueries({
        dataset: column.dataset,
        queries,
        options: {
          accessToken: session.token,
        },
      });
    }

    // 3. Search for relevant results
    sourcesContext = await queryDatasetSources({
      dataset: column.dataset,
      query: prompt,
      options: {
        accessToken: session.token,
      },
    });
  }

  // Sequential execution for fromScratch to accumulate examples
  // Get all existing cells in the column to achieve diversity
  const existingCellsExamples = column.cells
    .filter((cell) => cell.value)
    .map((cell) => ({
      output: cell.value,
      validated: cell.validated,
      inputs: {},
    }));

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
  const { columnsReferences, modelName, modelProvider, prompt, searchEnabled } =
    process;

  const streamRequests: PromptExecutionParams[] = [];
  const cells = new Map<number, Cell>();

  // Get initial examples from validated cells
  const currentExamples = await collectValidatedExamples({
    validatedCells,
    columnsReferences,
  });

  const validatedIdxs = validatedCells?.map((cell) => cell.idx);
  // Create all cells and requests in order
  for (let i = offset; i < limit + offset; i++) {
    if (validatedIdxs?.includes(i)) continue;

    const cell = await (updateOnly
      ? getColumnCellByIdx({ idx: i, columnId: column.id })
      : getOrCreateCellInDB(column.id, i));

    if (!cell) continue;

    const rowCells = await getRowCells({
      rowIdx: i,
      columns: columnsReferences,
    });

    if (rowCells?.filter((cell) => cell.value).length === 0) {
      cell.generating = false;
      cell.error = 'No input data found';

      await updateCell(cell);

      yield { cell };
      continue;
    }

    const data = Object.fromEntries(
      rowCells.map((cell) => [cell.column!.name, cell.value]),
    );

    const args: PromptExecutionParams = {
      accessToken: session.token,
      modelName,
      modelProvider,
      examples: currentExamples,
      instruction: prompt,
      timeout,
      data,
      idx: i,
    };

    if (searchEnabled) {
      args.sourcesContext = await queryDatasetSources({
        dataset: column.dataset,
        query: renderInstruction(prompt, args.data),
        options: {
          accessToken: session.token,
        },
      });
    }

    cell.generating = true;
    cells.set(i, cell);

    streamRequests.push(args);
  }

  // Initial yield of empty cells in order
  const orderedIndices = Array.from(cells.keys()).sort((a, b) => a - b);
  for (const idx of orderedIndices) {
    const cell = cells.get(idx);
    if (cell) yield { cell };
  }

  // Process responses in order
  for await (const { idx, response } of runPromptExecutionStreamBatch(
    streamRequests,
  )) {
    if (idx === undefined) continue;

    const cell = cells.get(idx);
    if (!cell) continue;

    // Update cell with response
    cell.value = response.value || '';
    cell.error = response.error;

    if (response.done || !cell.value) {
      cell.generating = false;
      await updateCell(cell);

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

function buildWebSearchQueries({
  prompt,
  column,
  options,
}: {
  prompt: string;
  column: Column;
  options: { accessToken: string };
}): Promise<string[]> {
  return Promise.resolve([]);
}
