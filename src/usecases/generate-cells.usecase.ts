import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getValidatedColumnCells, updateCell, updateColumn } from '~/services';
import { type Cell, type Column, useServerSession } from '~/state';
import { generateCells } from './generate-cells';

export const useGenerateCellsUseCase = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    column: Column,
  ): AsyncGenerator<Cell> {
    const session = useServerSession(this);
    if (!column.process) return;

    const validatedCells = await getValidatedColumnCells({
      column,
    });

    const { limit, offset } = column.process!;

    const generatedCells: Cell[] = [];
    this.signal.onabort = async () => {
      for (const cell of generatedCells.filter((c) => c.generating)) {
        cell.generating = false;
        await updateCell(cell);
      }
      await updateColumn(column);
    };

    for await (const { cell } of generateCells({
      column,
      process: column.process,
      session,
      limit,
      offset,
      validatedCells,
    })) {
      generatedCells.push(cell);
      yield cell;
    }

    await updateColumn(column);
  });
