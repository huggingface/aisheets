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
  const { columnsReferences, modelName, modelProvider, prompt } = process;

  if (!limit) limit = (await getMaxRowIdxByColumnId(column.id)) + 1;
  if (!offset) offset = 0;

  try {
    if (!columnsReferences?.length) {
      yield* generateCellsFromScratch({
        column,
        prompt,
        modelName,
        modelProvider,
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
        prompt,
        modelName,
        modelProvider,
        validatedCells,
        columnsReferences,
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
async function* generateCellsFromScratch({
  column,
  prompt,
  modelName,
  modelProvider,
  validatedCells,
  offset,
  limit,
  stream,
  updateOnly,
  timeout,
  session,
}: {
  column: Column;
  prompt: string;
  modelName: string;
  modelProvider: string;
  validatedCells: Cell[];
  offset: number;
  limit: number;
  stream: boolean;
  updateOnly: boolean;
  timeout: number | undefined;
  session: Session;
}) {
  const sourcesContext = await queryDatasetSources({
    dataset: column.dataset,
    query: prompt,
    options: {
      accessToken: session.token,
    },
  });

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
  prompt,
  modelName,
  modelProvider,
  columnsReferences,
  validatedCells,
  offset,
  limit,
  updateOnly,
  timeout,
  session,
}: {
  column: Column;
  prompt: string;
  modelName: string;
  modelProvider: string;
  columnsReferences: string[];
  validatedCells?: Cell[];
  offset: number;
  limit: number;
  updateOnly: boolean;
  timeout: number | undefined;
  session: Session;
}) {
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

    const args: PromptExecutionParams = {
      accessToken: session.token,
      modelName,
      modelProvider,
      examples: currentExamples,
      instruction: prompt,
      timeout,
      data: {},
      idx: i,
    };

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

    args.data = Object.fromEntries(
      rowCells.map((cell) => [cell.column!.name, cell.value]),
    );

    args.sourcesContext = await queryDatasetSources({
      dataset: column.dataset,
      query: renderInstruction(prompt, args.data),
      options: {
        accessToken: session.token,
      },
    });

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
    }

    yield { cell };
  }
}
