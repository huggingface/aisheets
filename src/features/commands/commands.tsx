import { $, component$ } from '@builder.io/qwik';
import { AddDynamicColumnSidebar } from '~/features/add-column/add-dynamic-column-sidebar';
import { type CreateColumn, useColumnsStore } from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';

export const Commands = component$(() => {
  const { addColumn, replaceCell } = useColumnsStore();

  const addNewColumn = useAddColumnUseCase();
  const onCreateColumn = $(async (createColumn: CreateColumn) => {
    const response = await addNewColumn(createColumn);

    for await (const { column, cell } of response) {
      if (column) {
        addColumn(column);
      }
      if (cell) {
        replaceCell(cell);
      }
    }
  });

  return (
    <div class="flex w-full items-center justify-between">
      <div class="flex space-x-2">{/* Left side empty for now */}</div>

      <div class="flex space-x-2">
        <AddDynamicColumnSidebar onCreateColumn={onCreateColumn} />
      </div>
    </div>
  );
});
