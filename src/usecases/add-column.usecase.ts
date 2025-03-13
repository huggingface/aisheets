import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { createColumn, updateCell } from '~/services';
import {
  type Cell,
  type Column,
  type CreateColumn,
  useServerSession,
} from '~/state';
import { generateCells } from './generate-cells';

export const useAddColumnUseCase = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    newColum: CreateColumn,
  ): AsyncGenerator<{ column?: Column; cell?: Cell }> {
    if (!newColum.process)
      throw new Error('Process is required to create a column');

    const session = useServerSession(this);
    const column = await createColumn({
      name: newColum.name,
      type: newColum.type,
      kind: newColum.kind,
      dataset: newColum.dataset,
      process: newColum.process,
    });

    yield {
      column: {
        id: column.id,
        name: column.name,
        type: column.type,
        kind: column.kind,
        cells: [],
        dataset: column.dataset,
        process: column.process,
        visible: column.visible,
      },
    };

    for await (const { cell } of generateCells({
      column,
      process: column.process!,
      session,
      limit: column.process!.limit!,
      offset: column.process!.offset,
    })) {
      this.signal.onabort = () => {
        cell.generating = false;

        updateCell(cell);
      };

      yield { cell };
    }
  });
