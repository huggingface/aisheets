import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getColumnCells } from '~/services';
import { type Cell, type Column, useServerSession } from '~/state';
import { generateCells } from './generate-cells';

export const useRegenerateCellsUseCase = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    column: Column,
  ): AsyncGenerator<Cell> {
    const session = useServerSession(this);

    if (!column.process) return;

    const validatedCells = await getColumnCells({
      column,
      conditions: { validated: true },
    });

    for await (const { cell } of generateCells({
      column,
      process: column.process!,
      session,
      validatedCells,
    })) {
      yield cell;
    }
  });
