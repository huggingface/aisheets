import { type RequestEventBase, server$ } from '@builder.io/qwik-city';

import { addColumn } from '~/services';
import { getRowCells } from '~/services/repository';
import { type Cell, type CreateColumn, useServerSession } from '~/state';
import { runPromptExecution } from '~/usecases/run-prompt-execution';

export const useAddColumnUseCase = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    newColum: CreateColumn,
  ) {
    const session = useServerSession(this);

    const { name, type, kind, process } = newColum;

    const column = await addColumn(
      {
        name,
        type,
        kind,
      },
      process,
    );

    yield {
      column: {
        id: column.id,
        name: column.name,
        type: column.type,
        kind: column.kind,
        cells: [],
        process: column.process,
      },
    };

    if (kind === 'dynamic') {
      const { limit, offset, modelName, prompt, columnsReferences } = process!;

      const examples: string[] = [];
      for (let i = offset; i < limit + offset; i++) {
        const args = {
          accessToken: session.token,
          modelName,
          examples,
          instruction: prompt,
          data: {},
        };

        if (columnsReferences && columnsReferences.length > 0) {
          const rowCells = await getRowCells({
            rowIdx: i,
            columns: columnsReferences,
          });
          args.data = Object.fromEntries(
            rowCells.map((cell) => [cell.column!.name, cell.value]),
          );
        }

        const response = await runPromptExecution(args);

        const cell: Cell = await column.addCell({
          idx: i,
          value: response.value,
          error: response.error,
        });

        yield {
          cell,
        };

        if (response.value) {
          examples.push(response.value);
        }
      }
    } else {
      // Iterate based on quantity of rows.
      for (let idx = 0; idx < 2; idx++) {
        await column.addCell({
          idx,
          value: '',
          error: '',
        });
      }
    }
  });
