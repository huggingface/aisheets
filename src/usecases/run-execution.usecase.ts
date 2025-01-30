import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getColumnById, updateCell } from '~/services';
import { useServerSession } from '~/state';
import { runPromptExecutionStream } from '~/usecases/run-prompt-execution';

export const useReRunExecution = () =>
  server$(async function* (
    this: RequestEventBase<QwikCityPlatform>,
    columnId: string,
  ) {
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
      try {
        for await (const response of runPromptExecutionStream(args)) {
          cell.value = response.value;
          cell.error = response.error;
          cell.updatedAt = new Date();

          yield {
            cell,
            done: response.done,
          };

          // Only save to database when stream is complete
          if (response.done) {
            await updateCell(cell);
          }
        }
      } catch (error) {
        console.error('Error processing cell:', error);
        cell.error = error instanceof Error ? error.message : 'Unknown error';
        yield {
          cell,
          done: true,
        };
      }
    }
  });
