import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getColumnCells, updateCell, updateColumn } from '~/services';
import { type Cell, type Column, serverSession } from '~/state';
import { generateCells } from './generate-cells';

export const useEditColumnUseCase = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    column: Column,
    accessToken: string,
  ): AsyncGenerator<{ column?: Column; cell?: Cell }> {
    if (!column.process)
      throw new Error('Process is required to create a column');

    const session = await serverSession(accessToken);

    const validatedCells = await getColumnCells({
      column,
      conditions: { validated: true },
    });

    for await (const { cell } of generateCells({
      column,
      process: column.process!,
      session,
      limit: column.process!.limit!,
      offset: column.process!.offset,
      validatedCells,
      parallel: column.process!.columnsReferences?.length > 0,
    })) {
      this.signal.onabort = async () => {
        cell.generating = false;

        await updateCell(cell);
        await updateColumn(column);
      };

      yield { cell };
    }

    const updated = await updateColumn(column);

    yield {
      column: updated,
    };
  });
