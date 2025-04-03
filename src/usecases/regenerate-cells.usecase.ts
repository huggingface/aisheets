import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getValidatedColumnCells } from '~/services';
import { type Cell, type Column, useServerSession } from '~/state';
import { generateCells } from './generate-cells';

export const useRegenerateCellsUseCase = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    column: Column,
  ): AsyncGenerator<Cell> {
    const session = useServerSession(this);
    if (!column.process) return;

    const validatedCells = await getValidatedColumnCells({
      column,
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
