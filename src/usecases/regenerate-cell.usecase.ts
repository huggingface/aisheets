import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import {
  getColumnById,
  getPersistedColumnCells,
  getValidatedColumnCells,
} from '~/services';
import { type Cell, useServerSession } from '~/state';
import { generateCells } from './generate-cells';

export const useRegenerateCellUseCase = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    cell: Cell,
  ): AsyncGenerator<Cell> {
    const session = useServerSession(this);

    if (!cell.column) throw new Error('Cell does not have a column');

    const column = await getColumnById(cell.column.id);
    if (!column) throw new Error('Column not found');

    if (!column?.process) return cell;

    let validatedCells = await getValidatedColumnCells({
      column,
    });

    if (!validatedCells.length) {
      validatedCells = await getPersistedColumnCells({
        column,
        offset: 0,
        limit: 10,
        filters: {
          error: null,
        },
      });
    }

    for await (const result of generateCells({
      column,
      process: column.process,
      session,
      validatedCells,
      parallel: false,
      limit: 1,
      offset: cell.idx,
    })) {
      yield result.cell;
    }
  });
