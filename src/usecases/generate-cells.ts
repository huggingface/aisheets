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
  limit: number;
  offset: number;
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
  parallel = false,
}: GenerateCellsParams) {
  const { columnsReferences, modelName, modelProvider, prompt } = process;

  const examples = await collectExamples({
    column,
    validatedCells,
    columnsReferences,
  });

  const validatedIdxs = validatedCells?.map((cell) => cell.idx);

  if (!stream) {
    for (let i = offset; i < limit + offset; i++) {
      if (validatedIdxs?.includes(i)) {
        continue;
      }

      const args = {
        accessToken: session.token,
        modelName,
        modelProvider,
        examples,
        instruction: prompt,
        timeout,
        data: {},
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

      const cell =
        (await getColumnCellByIdx({ idx: i, columnId: column.id })) ??
        (await createCell({
          cell: { idx: i },
          columnId: column.id,
        }));

      cell.generating = true;

      const response = await runPromptExecution(args);
      cell.value = response.value;
      cell.error = response.error;

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
    return;
  }

  // Only use parallel execution when we have referenced columns
  if (parallel && columnsReferences?.length > 0) {
    const streamRequests: PromptExecutionParams[] = [];
    const cells = new Map<number, Cell>();

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
        idx: i,
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

    for await (const { idx, response } of runPromptExecutionStreamBatch(
      streamRequests,
    )) {
      const cell = cells.get(idx)!;
      cell.value = response.value;
      cell.error = response.error;

      if (!response.done) {
        yield { cell };
      } else {
        cell.generating = false;
        await updateCell(cell);
        yield { cell };
      }
    }

    return;
  }

  // Use sequential execution for cases without referenced columns
  for (let i = offset; i < limit + offset; i++) {
    if (validatedIdxs?.includes(i)) {
      continue;
    }

    const args = {
      accessToken: session.token,
      modelName,
      modelProvider,
      examples,
      instruction: prompt,
      timeout,
      data: {},
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

    const cell =
      (await getColumnCellByIdx({ idx: i, columnId: column.id })) ??
      (await createCell({
        cell: { idx: i },
        columnId: column.id,
      }));

    cell.generating = true;

    for await (const response of runPromptExecutionStream(args)) {
      cell.value = response.value;
      cell.error = response.error;

      if (!response.done) yield { cell };
    }

    cell.generating = false;

    await updateCell(cell);
    yield { cell };

    if (cell.value && !(validatedCells?.length || columnsReferences?.length)) {
      examples.push({ output: cell.value, inputs: {} });
    }
  }
};
