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
  const datasets = useLoadDatasets();
  const { activeDataset } = useDatasetsStore();

  const columns = useLoadColumns();
  const { addColumn } = useColumnsStore();

  const execute = useAddColumnUseCase();

  const onCreateColumn = $(async (createColumn: CreateColumn) => {
    const column = await execute({
      ...createColumn,
      dataset: activeDataset.value,
    });

    addColumn(column);
  });

  return {
    datasets,
    columns,
    onCreateColumn,
  };
};
