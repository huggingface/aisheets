import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getColumnCells, updateColumn } from '~/services';
import { type Column, useServerSession } from '~/state';
import { generateCells } from './generate-cells';

export const useEditColumn = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    column: Column,
  ) {
    const session = useServerSession(this);
    column = await updateColumn(column);

    if (!column.process) {
      return;
    }

    const validatedCells = await getColumnCells({
      column,
      conditions: { validated: true },
    });

    yield* generateCells({
      column,
      process: column.process!,
      session,
      limit: column.process!.limit!,
      offset: column.process!.offset,
      validatedCells,
    });
  });
