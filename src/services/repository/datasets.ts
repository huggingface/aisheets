import { DatasetModel } from '~/services/db/models';
import type { Dataset } from '~/state';
import { getColumnCells } from './cells';
import { getDatasetColumns } from './columns';
import { sendTelemetry } from './hub/telemetry';
import {
  countDatasetTableRows,
  createDatasetTable,
  createDatasetTableFromFile,
} from './tables';

interface CreateDatasetParams {
  name: string;
  description?: string;
  createdBy: string;
}

export const createDatasetIdByUser = async ({
  createdBy,
}: { createdBy: string }): Promise<string> => {
  const model = await DatasetModel.create({
    name: 'New dataset',
    createdBy,
  });

  await createDatasetTable({ dataset: model });

  return model.id;
};

export const getUserDatasets = async (user: {
  username: string;
}): Promise<Dataset[]> => {
  const model = await DatasetModel.findAll({
    where: { createdBy: user.username },
    order: [['createdAt', 'DESC']],
  });

  const datasets = await Promise.all(
    model.map(async (dataset) => {
      const datasetSize = await countDatasetTableRows({ dataset });

      return {
        id: dataset.id,
        name: dataset.name,
        createdBy: dataset.createdBy,
        columns: [],
        createdAt: dataset.createdAt,
        updatedAt: dataset.updatedAt,
        size: datasetSize,
      };
    }),
  );

  return datasets;
};

export const importDatasetFromFile = async (
  {
    name,
    createdBy,
    file,
  }: {
    name: string;
    createdBy: string;
    file: string;
  },
  options?: {
    limit?: number;
    secrets?: {
      googleSheets?: string;
    };
  },
): Promise<Dataset> => {
  const model = await DatasetModel.create({
    name,
    createdBy,
  });

  try {
    const columns = await createDatasetTableFromFile(
      {
        dataset: {
          id: model.id,
          name: model.name,
          createdBy: model.createdBy,
        },
        file,
      },
      options,
    );

    const datasetSize = await countDatasetTableRows({ dataset: model });

    sendTelemetry('dataset.import', createdBy, {
      datasetId: model.id,
    });

    return {
      id: model.id,
      name: model.name,
      createdBy: model.createdBy,
      columns,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      size: datasetSize,
    };
  } catch (error) {
    console.error('Error importing dataset from file:', error);
    await model.destroy();
    throw new Error('Failed to import dataset from file');
  }
};

export const createDataset = async ({
  name,
  createdBy,
}: CreateDatasetParams): Promise<Dataset> => {
  const model = await DatasetModel.create({
    name,
    createdBy,
  });

  try {
    await createDatasetTable({ dataset: model });

    sendTelemetry('dataset.create', createdBy, {
      datasetId: model.id,
    });

    return {
      id: model.id,
      name: model.name,
      createdBy: model.createdBy,
      columns: [],
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      size: 0,
    };
  } catch (error) {
    console.error('Error creating dataset:', error);
    await model.destroy();
    throw new Error('Failed to create dataset');
  }
};

export const getDatasetById = async (id: string): Promise<Dataset | null> => {
  const model = await DatasetModel.findByPk(id);

  if (!model) return null;

  const columns = await getDatasetColumns(model);
  const datasetSize = await countDatasetTableRows({ dataset: model });

  const dataset = {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
    columns,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    size: datasetSize,
  };

  // Ideally, this should be done by the table-body component. But, if we remove this
  // line, the table-body rendering get weird the first time. Need to investigate.
  // cc @damianpumar
  await Promise.all(
    dataset.columns.map(async (column) => {
      column.cells = await getColumnCells({
        column,
      });
    }),
  );

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

  const datasetSize = await countDatasetTableRows({ dataset: model });

  return {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
    columns: [],
    size: datasetSize,
  };
};
