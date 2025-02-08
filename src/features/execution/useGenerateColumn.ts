import { $ } from '@builder.io/qwik';
import { useModals } from '~/components';
import {
  type Column,
  type CreateColumn,
  TEMPORAL_ID,
  useColumnsStore,
} from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';
import { useEditColumnUseCase } from '~/usecases/edit-column.usecase';

export const useGenerateColumn = () => {
  const { openAddDynamicColumnSidebar } = useModals('addDynamicColumnSidebar');
  const {
    state: columns,
    addColumn,
    updateColumn,
    replaceCell,
  } = useColumnsStore();
  const addNewColumn = useAddColumnUseCase();
  const editColumn = useEditColumnUseCase();

  const onCreateColumn = $(async (newColumn: CreateColumn): Promise<Column> => {
    const response = await addNewColumn(newColumn);

    for await (const { column, cell } of response) {
      if (column) {
        await addColumn(column);

        openAddDynamicColumnSidebar({
          columnId: column.id,
          mode: 'edit',
        });
      }
      if (cell) {
        replaceCell(cell);
      }
    }

    return columns.value.slice(-1)[0];
  });

  const onUpdateCell = $(async (column: Column): Promise<Column> => {
    const response = await editColumn(column);

    for await (const { column, cell } of response) {
      if (column) {
        updateColumn(column);
      }
      if (cell) {
        replaceCell(cell);
      }
    }

    return columns.value.find((c) => c.id === column.id)!;
  });

  const onGenerateColumn = $(async (column: Column): Promise<Column> => {
    if (column.id === TEMPORAL_ID) {
      return onCreateColumn(column);
    }

    return onUpdateCell(column);
  });

  return onGenerateColumn;
};
