import { getColumnSize, updateProcess } from '~/services';
import {
  createCell,
  getColumnCellByIdx,
  getRowCells,
  updateCell,
} from '~/services/repository/cells';
import type { Cell, Column, Process, Session } from '~/state';
import { collectExamples } from './collect-examples';
import {
  runPromptExecution,
  runPromptExecutionStream,
  runPromptExecutionStreamBatch,
} from './run-prompt-execution';
import type { PromptExecutionParams } from './run-prompt-execution';

export interface GenerateCellsParams {
  column: Column;
  process: Process;
  session: Session;
  limit?: number;
  offset?: number;
  validatedCells?: Cell[];
  stream?: boolean;
  timeout?: number;
  parallel?: boolean;
}

/**
 * Generates cells for a given column, process, and session.
 * This function is an async generator that yields generated cells.
 *
 * @param {GenerateCellsParams} params - The parameters for generating cells.
 * @param {Column} params.column - The column for which cells are being generated.
 * @param {Process} params.process - The process containing model and prompt information.
 * @param {Session} params.session - The session containing the access token.
 * @param {number} params.limit - The number of cells to generate.
 * @param {number} params.offset - The starting index for cell generation.
 * @param {Cell[]} [params.validatedCells] - The cells that have already been validated.
 *
 * @yields {Promise<{ cell: Cell }>} - An object containing the generated cell.
 */
export const generateCells = async function* ({
  column,
  process,
  session,
  limit,
  offset,
  validatedCells = [],
  stream = true,
  timeout,
  parallel = false,
}: GenerateCellsParams) {
  const { columnsReferences, modelName, modelProvider, prompt } = process;

  // Track all our generated cells to use as examples
  const generatedCells: Cell[] = [];

  // Get initial examples from validated cells
  let currentExamples = await collectExamples({
    column,
    validatedCells,
    columnsReferences,
  });

  const validatedIdxs = validatedCells?.map((cell) => cell.idx);

  if (!limit) limit = await getColumnSize(column);
  if (!offset) offset = 0;

  try {
    // Parallel execution (when we have column references)
    if (parallel && columnsReferences?.length > 0) {
      const streamRequests: PromptExecutionParams[] = [];
      const cells = new Map<number, Cell>();

      // Create all cells and requests in order
      for (let i = offset; i < limit + offset; i++) {
        if (validatedIdxs?.includes(i)) continue;

        const cell =
          (await getColumnCellByIdx({ idx: i, columnId: column.id })) ??
          (await createCell({ cell: { idx: i }, columnId: column.id }));

        cell.generating = true;
        cells.set(i, cell);

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

        if (columnsReferences?.length) {
          const rowCells = await getRowCells({
            rowIdx: i,
            columns: columnsReferences,
          });
          args.data = Object.fromEntries(
            rowCells.map((cell) => [cell.column!.name, cell.value]),
          );
        }

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

      return;
    }

    // Sequential execution for fromScratch to accumulate examples
    for (let i = offset; i < limit + offset; i++) {
      if (validatedIdxs?.includes(i)) continue;

      let cell = await getColumnCellByIdx({ idx: i, columnId: column.id });
      if (!cell) {
        cell = await createCell({ cell: { idx: i }, columnId: column.id });
      }

      cell.generating = true;
      yield { cell };

      const args = {
        accessToken: session.token,
        modelName,
        modelProvider,
        examples: currentExamples,
        instruction: prompt,
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
        generatedCells.push(cell);
        // Recollect examples using ALL validated and generated cells
        currentExamples = await collectExamples({
          column,
          validatedCells: [...validatedCells, ...generatedCells],
          columnsReferences,
        });
      }
    }
  } finally {
    process.updatedAt = new Date();
    await updateProcess(process);
  }
};
