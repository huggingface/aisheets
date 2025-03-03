import { Sequelize } from 'sequelize';
import {
  ColumnCellModel,
  ColumnModel,
  DatasetModel,
  ProcessModel,
} from '~/services/db/models';
import type { Dataset } from '~/state';
import { modelToColumn } from './columns';

interface CreateDatasetParams {
  name: string;
  description?: string;
  createdBy: string;
}

export const getOrCreateDatasetIDByUser = async ({
  createdBy,
}: { createdBy: string }): Promise<string> => {
  const [model] = await DatasetModel.findOrCreate({
    where: { createdBy },
    defaults: {
      name: 'New dataset',
      createdBy,
    },
  });

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

export const createDataset = async ({
  name,
  createdBy,
}: CreateDatasetParams): Promise<Dataset> => {
  const model = await DatasetModel.create({
    name,
    createdBy,
  });

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

  const rows = options?.cellsByColumn;

  if (rows && rows > 0) {
    columnsInclude.push({
      association: ColumnModel.associations.cells as any,
      separate: true,
      order: [['createdAt', 'ASC']],
      limit: rows,
    });
  }

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

  if (!model) {
    return null;
  }

  return {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
    columns: model.columns.map((column) => {
      column.dataset = model;
      return modelToColumn(column);
    }),
  };
};

export const updateDataset = async ({
  id,
  name,
}: {
  id: string;
  name: string;
}): Promise<Dataset> => {
  const model = await DatasetModel.findByPk(id);
  if (!model) {
    throw new Error('Dataset not found');
  }

  model.set({ name });
  await model.save();

  return {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
    columns: [],
  };
};

export const listDatasetRows = async function* ({
  dataset,
  conditions,
}: {
  dataset: Dataset;
  conditions?: Record<string, any>;
}): AsyncGenerator<Record<string, any>> {
  const caseWhen = dataset.columns?.map((column) =>
    Sequelize.literal(
      `MAX(CASE WHEN columnId = '${column.id}' THEN value END) AS '${column.name}'`,
    ),
  );

  const results = await ColumnCellModel.findAll({
    raw: true,
    attributes: ['idx', ...(caseWhen! as any)],
    where: { ...conditions },
    group: 'idx',
  });

  for await (const row of results) {
    yield row;
  }
};
