import { type RequestEventBase, server$ } from '@builder.io/qwik-city';

import { addColumn } from '~/services';
import { getRowCells } from '~/services/repository';
import { type Column, type CreateColumn, useServerSession } from '~/state';
import { runPromptExecution } from '~/usecases/run-prompt-execution';

export const useAddColumnUseCase = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    newColum: CreateColumn,
  ): Promise<Column> {
    const session = useServerSession(this);

    const { name, type, kind, executionProcess } = newColum;

    const column = await addColumn(
      {
        name,
        type,
        kind,
      },
      executionProcess,
    );

    if (kind === 'dynamic') {
      const { limit, offset, modelName, prompt, columnsReferences } =
        executionProcess!;

      const examples: string[] = [];
      for (let i = offset; i < limit + offset; i++) {
        const args = {
          accessToken: session.token,
          modelName,
          examples,
          instruction: prompt,
          data: {},
        };

        const data: object = {};
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

        await column.addCell({
          idx: i,
          value: response.value,
          error: response.error,
        });

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

    return {
      id: column.id,
      name: column.name,
      type: column.type,
      kind: column.kind,
      cells: column.cells.map((cell) => ({
        id: cell.id,
        idx: cell.idx,
        value: cell.value,
        error: cell.error,
      })),
      process: column.process
        ? {
            modelName: column.process.modelName,
            columnsReferences: column.process.columnsReferences,
            prompt: column.process.prompt,
            limit: column.process.limit,
            offset: column.process.offset,
          }
        : undefined,
    };
  });
