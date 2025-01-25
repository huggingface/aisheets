import { server$ } from '@builder.io/qwik-city';

import { addColumn } from '~/services';
import type { Column, CreateColumn } from '~/state';
import { runPromptExecution } from '~/usecases/run-prompt-execution';

export const useAddColumnUseCase = () =>
  server$(async (newColum: CreateColumn): Promise<Column> => {
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
      const { limit, offset, modelName, prompt } = executionProcess!;

      const examples: string[] = [];
      for (let i = offset; i < limit + offset; i++) {
        const response = await runPromptExecution({
          accessToken: process.env.HF_TOKEN, // TODO: reading from sharedMap is not working.
          modelName,
          instruction: prompt,
          examples,
        });

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
            prompt: column.process.prompt,
            limit: column.process.limit,
            offset: column.process.offset,
          }
        : undefined,
    };
  });
