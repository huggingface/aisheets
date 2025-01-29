import { DatasetModel } from '~/services/db/models/dataset';
import type { Dataset } from '~/state';
interface CreateDatasetParams {
  name: string;
  description?: string;
  createdBy: string;
}

export const getOrCreateDataset = async ({
  createdBy,
}: { createdBy: string }): Promise<Dataset> => {
  let dataset = await DatasetModel.findOne({
    where: { createdBy },
  });

  if (!dataset) {
    dataset = await createDataset({
      name: 'My Dataset',
      createdBy,
    });
  }

  return {
    id: dataset.id,
    name: dataset.name,
    createdBy: dataset.createdBy,
  };
};

export const createDataset = async ({
  name,
  createdBy,
}: CreateDatasetParams): Promise<DatasetModel> => {
  return DatasetModel.create({
    name,
    createdBy,
  });
};
