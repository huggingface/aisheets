import { $ } from '@builder.io/qwik';
import { useExecution } from '~/features/add-column';
import {
  type Column,
  type CreateColumn,
  TEMPORAL_ID,
  useColumnsStore,
} from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';
import { useEditColumnUseCase } from '~/usecases/edit-column.usecase';

export const useGenerateColumn = () => {
  const { open } = useExecution();
  const { addColumn, updateColumn, replaceCell } = useColumnsStore();
  const addNewColumn = useAddColumnUseCase();
  const editColumn = useEditColumnUseCase();

  const onCreateColumn = $(async (newColumn: CreateColumn) => {
    const response = await addNewColumn(newColumn);

    for await (const { column, cell } of response) {
      if (column) {
        addColumn(column);

        open(column.id, 'edit');
      }
      if (cell) {
        replaceCell(cell);
      }
    }
  });

  const onRegenerateCells = $(async (column: Column) => {
    const limit = column.process?.limit!;

    for (const cell of column.cells
      .filter((c) => !c.validated)
      .slice(0, limit)) {
      replaceCell({
        ...cell,
        generating: true,
      });
    }

    const response = await editColumn(column);

    for await (const { column, cell } of response) {
      if (column) {
        updateColumn(column);
      }
      if (cell) {
        replaceCell(cell);
      }
    }
  });

  const onGenerateColumn = $(async (column: Column | CreateColumn) => {
    if ('id' in column && column.id === TEMPORAL_ID) {
      return onCreateColumn(column as CreateColumn);
    }
    return onRegenerateCells(column as Column);
  });

  return onGenerateColumn;
};
