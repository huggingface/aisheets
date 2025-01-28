import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getColumnById, updateCell } from '~/services';
import { type Column, useServerSession } from '~/state';
import { runPromptExecution } from '~/usecases/run-prompt-execution';

export const useReRunExecution = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    columnId: string,
  ): Promise<Column> {
    const session = useServerSession(this);
    const column = await getColumnById(columnId);

    if (!column) {
      //TODO:
      throw new Error('Column not found');
    }

    const { modelName, prompt } = column.process!;

    const examples = column.cells
      .filter((cell) => cell.validated)
      .map((cell) => cell.value!);

    const args = {
      accessToken: session.token,
      modelName,
      examples,
      instruction: prompt,
      data: {},
    };

    for (const cell of column.cells.filter((cell) => !cell.validated)) {
      const response = await runPromptExecution(args);

      cell.value = response.value;
      cell.error = response.error;

      await updateCell(cell);
    }

    return column;
  });
