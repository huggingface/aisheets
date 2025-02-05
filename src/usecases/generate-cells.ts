import {
  createCell,
  getColumnCellByIdx,
  getRowCells,
  updateCell,
} from '~/services';
import type { Cell, Column, Process, Session } from '~/state';
import { runPromptExecutionStream } from './run-prompt-execution';

export interface GenerateCellsParams {
  column: Column;
  process: Process;
  session: Session;
  limit: number;
  offset: number;
  validatedCells?: Cell[];
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
}: GenerateCellsParams) {
  const { columnsReferences, modelName, prompt } = process;

  const hasReferredColumns = columnsReferences && columnsReferences.length > 0;
  const hasValidatedCells = validatedCells && validatedCells.length > 0;

  const examples: string[] = validatedCells?.map((cell) => cell.value!) ?? [];
  const validatedIdxs = validatedCells?.map((cell) => cell.idx);

  for (let i = offset; i < limit + offset; i++) {
    if (validatedIdxs?.includes(i)) {
      continue;
    }

    const args = {
      accessToken: session.token,
      modelName,
      examples,
      instruction: prompt,
      data: {},
    };

    if (hasReferredColumns) {
      const rowCells = await getRowCells({
        rowIdx: i,
        columns: columnsReferences,
      });
      args.data = Object.fromEntries(
        rowCells.map((cell) => [cell.column!.name, cell.value]),
      );
    }

    const cell =
      (await getColumnCellByIdx({ column, idx: i })) ??
      (await createCell({
        cell: { idx: i },
        column,
      }));

    for await (const response of runPromptExecutionStream(args)) {
      cell.value = response.value;
      cell.error = response.error;

      if (!response.done) yield { cell };
    }

    // Only save to database when stream is complete
    await updateCell(cell);
    yield { cell };

    if (cell.value && !(hasValidatedCells || hasReferredColumns)) {
      examples.push(cell.value);
    }
  }
};
