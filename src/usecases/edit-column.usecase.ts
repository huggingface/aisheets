import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getColumnCells, updateColumn, updateProcess } from '~/services';
import { type Cell, type Column, useServerSession } from '~/state';
import { generateCells } from './generate-cells';

export const useEditColumnUseCase = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    toUpdate: Column,
  ): AsyncGenerator<{ column?: Column; cell?: Cell }> {
    const session = useServerSession(this);
    const column = await updateColumn(toUpdate);

    if (!column.process) {
      return;
    }

    yield {
      column,
    };

    const validatedCells = await getColumnCells({
      column,
      conditions: { validated: true },
    });

    yield* generateCells({
      column: column,
      process: column.process!,
      session,
      limit: column.process!.limit!,
      offset: column.process!.offset,
      validatedCells,
    });

    const process = await updateProcess(column.process);

    yield {
      column: {
        ...column,
        process,
      },
    };
  });
