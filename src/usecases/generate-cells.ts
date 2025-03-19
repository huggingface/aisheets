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
  validatedCells,
  stream = true,
  timeout,
  parallel,
}: GenerateCellsParams) {
  const { columnsReferences, modelName, modelProvider, prompt } = process;

  const examples = await collectExamples({
    column,
    validatedCells,
    columnsReferences,
  });

  const validatedIdxs = validatedCells?.map((cell) => cell.idx);

  if (!limit) limit = await getColumnSize(column);
  if (!offset) offset = 0;

  try {
    // Only use parallel execution when we have referenced columns
    if (parallel && columnsReferences?.length > 0) {
      const streamRequests: PromptExecutionParams[] = [];
      const cells = new Map<number, Cell>();
      const pendingResults = new Map<
        number,
        { value?: string; error?: string }
      >();

      for (let i = offset; i < limit + offset; i++) {
        if (validatedIdxs?.includes(i)) continue;

        const args: PromptExecutionParams = {
          accessToken: session.token,
          modelName,
          modelProvider,
          examples,
          instruction: prompt,
          timeout,
          data: {},
          idx: i, // Make sure idx is always defined
        };

        // We know we have referenced columns here
        const rowCells = await getRowCells({
          rowIdx: i,
          columns: columnsReferences,
        });
        args.data = Object.fromEntries(
          rowCells.map((cell) => [cell.column!.name, cell.value]),
        );

        const cell =
          (await getColumnCellByIdx({ idx: i, columnId: column.id })) ??
          (await createCell({
            cell: { idx: i },
            columnId: column.id,
          }));

        cell.generating = true;
        cells.set(i, cell);
        streamRequests.push(args);
      }

      // Create an ordered array to track which cells we need to update
      const orderedCells = Array.from(cells.keys()).sort((a, b) => a - b);

      for await (const { idx, response } of runPromptExecutionStreamBatch(
        streamRequests,
      )) {
        if (idx === undefined) {
          console.error('Received undefined idx in response');
          continue;
        }

        const cell = cells.get(idx);
        if (!cell) {
          console.error(`No cell found for idx ${idx}`);
          continue;
        }

        // Update the cell with the latest response
        cell.value = response.value;
        cell.error = response.error;

        // Store the latest result
        pendingResults.set(idx, {
          value: response.value,
          error: response.error,
        });

        // If the response is done, mark the cell as complete
        if (response.done) {
          cell.generating = false;
          await updateCell(cell);
        }

        // Yield the cell immediately - this allows for streaming updates
        yield { cell };
      }

      return;
    }

    for (let i = offset; i < limit + offset; i++) {
      if (validatedIdxs?.includes(i)) continue;

      const args = {
        accessToken: session.token,
        modelName,
        modelProvider,
        examples,
        instruction: prompt,
        timeout,
        data: {},
      };

      const rowCells = columnsReferences?.length
        ? await getRowCells({
            rowIdx: i,
            columns: columnsReferences,
          })
        : [];

      if (rowCells) {
        args.data = Object.fromEntries(
          rowCells.map((cell) => [cell.column!.name, cell.value]),
        );
      }

      let cell = await getColumnCellByIdx({ idx: i, columnId: column.id });

      if (!cell) {
        cell = await createCell({
          cell: { idx: i },
          columnId: column.id,
        });
      }

      cell.generating = true;

      yield { cell };

      if (stream) {
        for await (const response of runPromptExecutionStream({
          ...args,
          data: Object.fromEntries(
            rowCells.map((cell) => [cell.column!.name, cell.value]),
          ),
        })) {
          cell.value = response.value;
          cell.error = response.error;

          if (!response.done) yield { cell };
        }
      } else {
        const response = await runPromptExecution(args);
        cell.value = response.value;
        cell.error = response.error;
      }

      cell.generating = false;

      await updateCell(cell);

      yield { cell };

      // Add newly generated values as examples when there are no validated cells or referred columns
      if (
        cell.value &&
        !(validatedCells?.length || columnsReferences?.length)
      ) {
        examples.push({ output: cell.value, inputs: {} });
      }
    }
  } finally {
    // update the process to reflect the latest execution (we should use a more explict attribute for this)
    process.updatedAt = new Date();
    await updateProcess(process);
  }
};
