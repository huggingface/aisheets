import { ColumnModel, DatasetModel, ProcessModel } from '~/services/db/models';
import type { Dataset } from '~/state';
import { getColumnCells } from './cells';
import { modelToColumn } from './columns';
import { createDatasetTable, createDatasetTableFromFile } from './tables';

interface CreateDatasetParams {
  name: string;
  description?: string;
  createdBy: string;
}

export const getOrCreateDatasetIDByUser = async ({
  createdBy,
}: { createdBy: string }): Promise<string> => {
  const [model, created] = await DatasetModel.findOrCreate({
    where: { createdBy },
    defaults: {
      name: 'New dataset',
      createdBy,
    },
  });

  if (created) await createDatasetTable({ dataset: model });

  return model.id;
};

export const getUserDatasets = async (user: {
  username: string;
}): Promise<Dataset[]> => {
  const model = await DatasetModel.findAll({
    where: { createdBy: user.username },
  });

  const datasets = model.map((dataset) => ({
    id: dataset.id,
    name: dataset.name,
    createdBy: dataset.createdBy,
    columns: [],
  }));

  return datasets;
};

export const importDatasetFromFile = async ({
  name,
  createdBy,
  file,
}: {
  name: string;
  createdBy: string;
  file: string;
}): Promise<Dataset> => {
  const model = await DatasetModel.create({
    name,
    createdBy,
  });

  const columns = await createDatasetTableFromFile({
    dataset: {
      id: model.id,
      name: model.name,
      createdBy: model.createdBy,
    },
    file,
  });

  return {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
    columns,
  };
};

export const createDataset = async ({
  name,
  createdBy,
}: CreateDatasetParams): Promise<Dataset> => {
  const model = await DatasetModel.create({
    name,
    createdBy,
  });

  await createDatasetTable({ dataset: model });

  return {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
    columns: [],
  };
};

export const getDatasetById = async (
  id: string,
  options?: {
    cellsByColumn?: number;
  },
): Promise<Dataset | null> => {
  const columnsInclude: any[] = [
    {
      association: ColumnModel.associations.process,
      include: [ProcessModel.associations.referredColumns],
    },
  ];

  const model = await DatasetModel.findByPk(id, {
    include: [
      {
        association: DatasetModel.associations.columns,
        separate: true,
        order: [['createdAt', 'ASC']],
        include: columnsInclude,
      },
    ],
  });

  if (!model) return null;

  const dataset = {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
    columns: model.columns.map((column) => {
      column.dataset = model;
      return modelToColumn(column);
    }),
  };

  if (options?.cellsByColumn) {
    await Promise.all(
      dataset.columns.map(async (column) => {
        column.cells = await getColumnCells({
          column,
          limit: options?.cellsByColumn,
        });
      }),
    );
  }

  return dataset;
};

export const updateDataset = async ({
  id,
  name,
}: {
  id: string;
  name: string;
}): Promise<Dataset> => {
  const model = await DatasetModel.findByPk(id);
  if (!model) throw new Error('Dataset not found');

  model.set({ name });
  await model.save();

  return {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
    columns: [],
  };
};
