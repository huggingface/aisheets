import { $, component$ } from '@builder.io/qwik';
import { AddDynamicColumnSidebar } from '~/features/add-column/add-dynamic-column-sidebar';
import { type Column, type CreateColumn, useColumnsStore } from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';
import { useEditColumn } from '~/usecases/edit-column.usecase';

export const Execution = component$(() => {
  const { addColumn, replaceCell } = useColumnsStore();

  const addNewColumn = useAddColumnUseCase();

  const onCreateColumn = $(async (newColumn: CreateColumn) => {
    const response = await addNewColumn(newColumn);

    for await (const { column, cell } of response) {
      if (column) {
        addColumn(column);
      }
      if (cell) {
        replaceCell(cell);
      }
    }
  });

  const editColumn = useEditColumn();
  const onUpdateCell = $(async (column: Column) => {
    const response = await editColumn(column);

    for await (const { cell } of response) {
      replaceCell(cell);
    }
  });

  const onGenerateColumn = $(async (column: CreateColumn | Column) => {
    if ('id' in column) {
      await onUpdateCell(column);
    } else {
      await onCreateColumn(column);
    }
  });

  return <AddDynamicColumnSidebar onGenerateColumn={onGenerateColumn} />;
});
