import { Sequelize } from 'sequelize';
import { ColumnCellModel, DatasetModel } from '~/services/db/models';
import type { Dataset } from '~/state';
import { getDatasetColumns } from './columns';

interface CreateDatasetParams {
  name: string;
  description?: string;
  createdBy: string;
}

export const getOrCreateDataset = async ({
  createdBy,
}: { createdBy: string }): Promise<Dataset> => {
  const [model, created] = await DatasetModel.findOrCreate({
    where: { createdBy },
    defaults: {
      name: 'New dataset',
      createdBy,
    },
  });

  const dataset = {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
    columns: [],
  };

  if (created) {
    return dataset;
  }

  const columns = await getDatasetColumns(model.id);

  return { ...dataset, columns };
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

export const getDatasetById = async (id: string): Promise<Dataset | null> => {
  const model = await DatasetModel.findByPk(id);

  if (!model) {
    return null;
  }

  // TODO: Improve this and use only one query. Model2Type mappers should be used.
  const columns = await getDatasetColumns(model.id);

  return {
    id: model.id,
    name: model.name,
    createdBy: model.createdBy,
    columns,
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
