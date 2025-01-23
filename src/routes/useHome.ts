import { $ } from '@builder.io/qwik';

import { type CreateColumn, useColumnsStore, useLoadColumns } from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';

export const useHome = () => {
  const columns = useLoadColumns();
  const { addColumn } = useColumnsStore();

  const execute = useAddColumnUseCase();

  const onCreateColumn = $(async (createColumn: CreateColumn) => {
    const column = await execute(createColumn);

    addColumn(column);
  });

  return {
    columns,
    onCreateColumn,
  };
};
