import { Sequelize } from 'sequelize';
import {
  ColumnCellModel,
  ColumnModel,
  DatasetModel,
  ProcessModel,
} from '~/services/db/models';
import type { Dataset } from '~/state';
import { getColumnCells } from './cells';
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

  const dataset = {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
    columns: model.columns.map((column) => {
      column.dataset = model;
      return modelToColumn(column);
    }),
  };

  for (const column of dataset.columns) {
    column.cells = await getColumnCells({
      column,
      limit: options?.cellsByColumn,
    });
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
  visibleOnly,
}: {
  dataset: Dataset;
  conditions?: Record<string, any>;
  visibleOnly?: boolean;
}): AsyncGenerator<Record<string, any>> {
  let columns = dataset.columns;

  if (visibleOnly) {
    columns = dataset.columns?.filter((column) => column.visible);
  }

  const caseWhen = columns?.map((column) =>
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
