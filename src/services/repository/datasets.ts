import { DatasetModel } from '~/services/db/models/dataset';
import { getDatasetColumns } from '~/services/repository/columns';
import type { Dataset } from '~/state';
interface CreateDatasetParams {
  name: string;
  description?: string;
  createdBy: string;
}

export const getOrCreateDataset = async ({
  createdBy,
}: { createdBy: string }): Promise<Dataset> => {
  const model = await DatasetModel.findOne({
    where: { createdBy },
  });

  if (!model) {
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

  const columns = await getDatasetColumns(model.id);

  return {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
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
