import { getGeneratedColumnSize, updateProcess } from '~/services';
import {
  type PromptExecutionParams,
  runPromptExecution,
  runPromptExecutionStream,
  runPromptExecutionStreamBatch,
} from '~/services/inference/run-prompt-execution';

import { renderInstruction } from '~/services/inference/materialize-prompt';
import {
  createCell,
  getColumnCellByIdx,
  getRowCells,
  updateCell,
} from '~/services/repository/cells';
import { queryDatasetSources } from '~/services/websearch/embed';
import type { Cell, Column, Process, Session } from '~/state';
import { collectExamples } from './collect-examples';

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

  if (!limit) limit = await getGeneratedColumnSize(column.id);
  if (!offset) offset = 0;

  try {
    // Parallel execution (when we have column references)
    if (parallel && columnsReferences?.length > 0) {
      const streamRequests: PromptExecutionParams[] = [];
      const cells = new Map<number, Cell>();

      // Create all cells and requests in order
      for (let i = offset; i < limit + offset; i++) {
        if (validatedIdxs?.includes(i)) continue;

        const cell = await getOrCreateCellInDB(column.id, i);

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

        let queryPrompt = process.prompt;

        if (columnsReferences?.length) {
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

          queryPrompt = renderInstruction(process.prompt, args.data);
        }

        args.sourcesContext = await queryDatasetSources({
          dataset: column.dataset,
          query: queryPrompt,
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
          yield { cell };
        }
      }

      return;
    }

    const sourcesContext = await queryDatasetSources({
      dataset: column.dataset,
      query: process.prompt,
      options: {
        accessToken: session.token,
      },
    });

    // Sequential execution for fromScratch to accumulate examples
    for (let i = offset; i < limit + offset; i++) {
      if (validatedIdxs?.includes(i)) continue;

      const cell = await getOrCreateCellInDB(column.id, i);

      cell.generating = true;
      yield { cell };

      const args = {
        accessToken: session.token,
        modelName,
        modelProvider,
        examples: currentExamples,
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
