import { DatasetModel } from '~/services/db/models/dataset';
interface CreateDatasetParams {
  name: string;
  description?: string;
  createdBy: string;
}

export const getOrCreateDataset = async ({
  createdBy,
}: { createdBy: string }): Promise<DatasetModel> => {
  const dataset = await DatasetModel.findOne({
    where: { createdBy },
  });

  if (dataset) {
    return dataset;
  }

  return await createDataset({
    name: 'Default Dataset',
    createdBy,
  });
};

export const createDataset = async ({
  name,
  createdBy,
}: CreateDatasetParams): Promise<DatasetModel> => {
  const dataset = await DatasetModel.create({
    name,
    createdBy,
  });

  return dataset;
};
