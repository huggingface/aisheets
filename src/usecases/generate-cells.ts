import { NUM_CONCURRENT_REQUESTS } from '~/config';
import { getDatasetColumns, updateProcess } from '~/services';
import { MAX_SOURCE_SNIPPET_LENGTH } from '~/services/db/models/cell';
import { renderInstruction } from '~/services/inference/materialize-prompt';
import type { MaterializePromptParams } from '~/services/inference/materialize-prompt';
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
import { countDatasetTableRows } from '~/services/repository/tables';
import { queryDatasetSources } from '~/services/websearch/embed';
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

const MAX_CONCURRENCY = Math.min(NUM_CONCURRENT_REQUESTS, 8);

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

  if (!limit) {
    const columnIds = columnsReferences?.length
      ? columnsReferences
      : await getDatasetColumns(column.dataset).then((columns) =>
          columns.filter((col) => col.id !== column.id).map((col) => col.id),
        );

    const columnSizes = await Promise.all(
      columnIds.map((colId) => {
        return countDatasetTableRows({
          dataset: column.dataset,
          column: { id: colId },
        });
      }),
    );

    limit = Math.max(...columnSizes);
  }
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
      let remaining = limit;
      for (let i = offset; i < offset + limit; i += MAX_CONCURRENCY) {
        yield* generateCellsFromColumnsReferences({
          column,
          process,
          validatedCells,
          offset: i,
          limit: Math.min(MAX_CONCURRENCY, remaining),
          updateOnly,
          timeout,
          session,
        });

        remaining -= MAX_CONCURRENCY;
      }
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

  const sourcesContext = searchEnabled
    ? await queryDatasetSources({
        dataset: column.dataset,
        query: prompt,
        options: {
          accessToken: session.token,
        },
      })
    : undefined;

  // Extract sources (url + snippet) if available
  const sources = sourcesContext
    ? sourcesContext.map((source) => ({
        url: source.source_uri,
        snippet: source.text?.slice(0, MAX_SOURCE_SNIPPET_LENGTH) || '',
      }))
    : undefined;

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
  const cells = new Map<
    number,
    { cell: Cell; sources: CellSource[] | undefined }
  >();

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

    let sourcesContext: MaterializePromptParams['sourcesContext'];
    if (searchEnabled) {
      sourcesContext = await queryDatasetSources({
        dataset: column.dataset,
        query: renderInstruction(prompt, args.data),
        options: {
          accessToken: session.token,
        },
      });
      args.sourcesContext = sourcesContext;
    }

    // Extract sources (url + snippet) if available
    const sources = sourcesContext
      ? sourcesContext.map((source) => ({
          url: source.source_uri,
          snippet: source.text?.slice(0, MAX_SOURCE_SNIPPET_LENGTH) || '',
        }))
      : undefined;

    cell.generating = true;

    cells.set(i, { cell, sources });

    streamRequests.push(args);
  }

  // Initial yield of empty cells in order
  const orderedIndices = Array.from(cells.keys()).sort((a, b) => a - b);
  for (const idx of orderedIndices) {
    const cell = cells.get(idx)?.cell;
    if (cell) yield { cell };
  }

  // Process responses in order
  for await (const { idx, response } of runPromptExecutionStreamBatch(
    streamRequests,
  )) {
    if (idx === undefined) continue;

    const cellData = cells.get(idx);
    if (!cellData) continue;

    const { cell, sources } = cellData;
    // Update cell with response
    cell.value = response.value || '';
    cell.error = response.error;

    if (response.done || !cell.value) {
      if (cell.value && !cell.error) cell.sources = sources;
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
