import { $, component$ } from '@builder.io/qwik';
import { Button, useModals } from '~/components';
import { AddDynamicColumnSidebar } from '~/features/add-column/add-dynamic-column-sidebar';
import { ExportToHubSidebar } from '~/features/export-to-hub';
import {
  type Column,
  type CreateColumn,
  TEMPORAL_ID,
  useColumnsStore,
} from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';
import { useEditColumnUseCase } from '~/usecases/edit-column.usecase';

export const Execution = component$(() => {
  const {
    state: columns,
    addColumnFinalColumn,
    updateColumn,
    replaceCell,
  } = useColumnsStore();
  const { openExportToHubSidebar } = useModals('exportToHubSidebar');
  const addNewColumn = useAddColumnUseCase();
  const editColumn = useEditColumnUseCase();

  const onExportButtonClick = $(() => {
    openExportToHubSidebar();
  });

  const onCreateColumn = $(async (newColumn: CreateColumn): Promise<Column> => {
    const response = await addNewColumn(newColumn);

    for await (const { column, cell } of response) {
      if (column) {
        addColumnFinalColumn(column);
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

  return (
    <div class="flex w-full items-center justify-between">
      <div class="flex space-x-2">{/* Left side empty for now */}</div>

      <div class="flex space-x-2">
        <AddDynamicColumnSidebar onGenerateColumn={onGenerateColumn} />
      </div>

      <div class="flex space-x-2">
        <Button
          size="sm"
          class="flex gap-1 font-light"
          onClick$={onExportButtonClick}
        >
          Export to Hub
        </Button>
        <ExportToHubSidebar />
      </div>
    </div>
  );
});
