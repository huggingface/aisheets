import { $ } from '@builder.io/qwik';

import {
  type CreateColumn,
  useColumnsStore,
  useDatasetsStore,
  useLoadColumns,
  useLoadDatasets,
} from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';

export const useHome = () => {
  useLoadDatasets();
  const { activeDataset } = useDatasetsStore();
  const { state: columns, addColumn } = useColumnsStore();

  const execute = useAddColumnUseCase();

  const onCreateColumn = $(async (createColumn: CreateColumn) => {
    const column = await execute({
      ...createColumn,
      dataset: activeDataset.value,
    });
    
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
    columns,
    activeDataset,
    onCreateColumn,
  };
};
