import { $ } from '@builder.io/qwik';

import { type CreateColumn, useColumnsStore, useLoadColumns } from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';

export const useHome = () => {
  useLoadColumns();
  const { addColumn, addCell } = useColumnsStore();

  const execute = useAddColumnUseCase();

  const onCreateColumn = $(async (createColumn: CreateColumn) => {
    const response = await execute(createColumn);

    for await (const { column, cell } of response) {
      if (column) {
        addColumn(column);
      }

      if (cell) {
        addCell(cell);
      }
    }
  });

  return {
    onCreateColumn,
  };
};
