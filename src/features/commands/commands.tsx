import { $, component$ } from '@builder.io/qwik';
import { AddDynamicColumnSidebar } from '~/features/add-column/add-dynamic-column-sidebar';
import { ExportToHubSidebar } from '~/features/export-to-hub';
import { type CreateColumn, useColumnsStore } from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';

export const Commands = component$(() => {
  const { openAddDynamicColumnSidebar } = useModals('addDynamicColumnSidebar');
  const { openExportToHubSidebar } = useModals('exportToHubSidebar');
  const { addColumn, addCell } = useColumnsStore();

  const addNewColumn = useAddColumnUseCase();
  const onCreateColumn = $(async (createColumn: CreateColumn) => {
    const response = await addNewColumn(createColumn);

    for await (const { column, cell } of response) {
      if (column) {
        addColumn(column);
      }
      if (cell) {
        addCell(cell.cell);
      }
    }
  });

  return (
    <div class="flex w-full items-center justify-between">
      <div class="flex space-x-2">{/* Left side empty for now */}</div>

      <div class="flex space-x-2">
        <Button
          size="sm"
          look="outline"
          class="flex gap-1 font-light"
          onClick$={openAddDynamicColumnSidebar}
        >
          <TbColumnInsertRight />
          Add column
        </Button>
        <AddDynamicColumnSidebar onCreateColumn={onCreateColumn} />

        <Button
          size="sm"
          look="outline"
          class="flex gap-1 font-light"
          onClick$={openExportToHubSidebar}
        >
          <TbColumnInsertRight />
          Export to Hub
        </Button>
        <ExportToHubSidebar />
      </div>
    </div>
  );
});
