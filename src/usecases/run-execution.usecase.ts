import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { getColumnById, getRowCells, updateCell } from '~/services';
import { useServerSession } from '~/state';
import { runPromptExecution } from '~/usecases/run-prompt-execution';

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

    if (column.kind === 'dynamic') {
      const { modelName, prompt, columnsReferences } = column.process!;
      const examples = column.cells
        .filter((cell) => cell.validated)
        .map((cell) => cell.value!);

      for (const cell of column.cells.filter((cell) => !cell.validated)) {
        // TODO: This section is quite similar to the one in useAddColumnUseCase.
        // We should refactor this into a helper function.
        const args = {
          accessToken: session.token,
          modelName,
          examples,
          instruction: prompt,
          data: {},
        };

        if (columnsReferences && columnsReferences.length > 0) {
          const rowCells = await getRowCells({
            rowIdx: cell.idx,
            columns: columnsReferences,
          });
          args.data = Object.fromEntries(
            rowCells.map((cell) => [cell.column!.name, cell.value]),
          );
        }

        const response = await runPromptExecution(args);

        cell.value = response.value;
        cell.error = response.error;

        await updateCell(cell);

        yield {
          cell,
        };
      }
    }
  });
