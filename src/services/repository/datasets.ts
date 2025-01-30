import { DatasetModel } from '~/services/db/models/dataset';
import { getAllColumns } from '~/services/repository/columns';
import type { Dataset } from '~/state';
interface CreateDatasetParams {
  name: string;
  description?: string;
  createdBy: string;
}

export const getOrCreateDataset = async ({
  createdBy,
}: { createdBy: string }): Promise<Dataset> => {
  const dataset = await DatasetModel.findOne({
    where: { createdBy },
  });

  if (!dataset) {
    const newDataset = await createDataset({
      name: 'My Dataset',
      createdBy,
    });

    return {
      id: newDataset.id,
      name: newDataset.name,
      createdBy: newDataset.createdBy,
      columns: [],
    };
  }

  const columns = await getAllColumns(dataset.id);

  return {
    id: dataset.id,
    name: dataset.name,
    createdBy: dataset.createdBy,
    columns,
  };
};

export const createDataset = ({
  name,
  createdBy,
}: CreateDatasetParams): Promise<DatasetModel> => {
  return DatasetModel.create({
    name,
    createdBy,
  });
};
