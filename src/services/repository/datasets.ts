import { DatasetModel } from '~/services/db/models/dataset';
interface CreateDatasetParams {
  name: string;
  description?: string;
  createdBy: string;
}

export const getOrCreateDataset = async ({
  username,
}: { username: string }): Promise<DatasetModel> => {
  const dataset = await DatasetModel.findOne({
    where: {
      createdBy: username,
    },
  });

  if (dataset) {
    return dataset;
  }

  return await createDataset({
    name: 'Default Dataset',
    createdBy: username,
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
