import { type RequestEventBase, server$ } from '@builder.io/qwik-city';

import { createColumn } from '~/services/repository';
import { type CreateColumn, useServerSession } from '~/state';
import { generateCells } from './generate-cells';

export const useAddColumnUseCase = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    newColum: CreateColumn,
  ) {
    const session = useServerSession(this);
    const column = await createColumn(newColum);

    yield {
      column: {
        id: column.id,
        name: column.name,
        type: column.type,
        kind: column.kind,
        cells: [],
        dataset: column.dataset,
        process: column.process,
      },
    };

    if (!column.process) {
      return;
    }

    for await (const cell of generateCells({
      column,
      process: column.process!,
      session,
      limit: column.process!.limit!,
      offset: column.process!.offset,
    })) {
      yield { cell };
    }
  });
