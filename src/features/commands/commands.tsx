import { $, component$ } from '@builder.io/qwik';
import { TbColumnInsertRight } from '@qwikest/icons/tablericons';

import { Button } from '~/components';
import { useModals } from '~/components/hooks/modals/use-modals';
import { AddDynamicColumnSidebar } from '~/features/add-column/add-dynamic-column-sidebar';
import { type CreateColumn, useColumnsStore } from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';

export const Commands = component$(() => {
  const { openAddDynamicColumnSidebar } = useModals('addDynamicColumnSidebar');
  const { addColumn, addCell } = useColumnsStore();

  const addNewColumn = useAddColumnUseCase();
  const onCreateColumn = $(async (createColumn: CreateColumn) => {
    const response = await addNewColumn(createColumn);

    for await (const { column, cell } of response) {
      if (column) {
        addColumn(column);
      }
      if (cell) {
        addCell(cell);
      }
    }
  });

  return (
    <div class="flex h-12 w-full items-center justify-between">
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
      </div>
    </div>
  );
});
