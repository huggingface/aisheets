import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getColumnCells, updateColumn } from '~/services';
import { type Cell, type Column, useServerSession } from '~/state';
import { generateCells } from './generate-cells';

export const useEditColumnUseCase = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    column: Column,
  ): AsyncGenerator<{ column?: Column; cell?: Cell }> {
    const session = useServerSession(this);

    if (!column.process) {
      return;
    }

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

    const updated = await updateColumn(column);

    yield {
      column: updated,
    };
  });
