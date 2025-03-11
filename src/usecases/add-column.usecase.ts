import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { createColumn } from '~/services/repository';
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

    if (!column.process) {
      return;
    }

    yield* generateCells({
      column,
      process: column.process!,
      session,
      limit: column.process!.limit!,
      offset: column.process!.offset,
      parallel: column.process!.columnsReferences?.length > 0, // Only when we are not in the first col
    });
  });
