import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getColumnCells } from '~/services';
import { type Cell, type Column, serverSession } from '~/state';
import { generateCells } from './generate-cells';

export const useRegenerateCellsUseCase = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    column: Column,
    accessToken: string,
  ): AsyncGenerator<Cell> {
    const session = await serverSession(accessToken);
    if (!column.process) return;

    const validatedCells = await getColumnCells({
      column,
      conditions: { validated: true },
    });

    for await (const { cell } of generateCells({
      column,
      process: column.process,
      session,
      validatedCells,
      parallel: Boolean(column.process.columnsReferences?.length),
    })) {
      yield cell;
    }
  });
