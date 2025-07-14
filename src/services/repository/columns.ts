import { ColumnModel } from '~/services/db/models/column';
import { ProcessModel } from '~/services/db/models/process';
import type { Column, ColumnKind, CreateColumn } from '~/state';
import { getGeneratedCellsCount, getMaxCellIdxByColumnId } from './cells';
import { createProcess, updateProcess } from './processes';
import { countDatasetTableRows, createDatasetTableColumn } from './tables';

export const modelToColumn = (model: ColumnModel): Column => {
  return {
    id: model.id,
    name: model.name,
    type: model.type,
    kind: model.kind as ColumnKind,
    visible: model.visible,

    dataset: {
      id: model.dataset.id,
      name: model.dataset.name,
      createdBy: model.dataset.createdBy,
    },

    numberOfCells: model.numberOfCells,

    process: {
      id: model.process?.id,
      columnsReferences: (model.process?.referredColumns ?? []).map(
        (columnRef) => columnRef.id,
      ),
      modelName: model.process?.modelName ?? '',
      modelProvider: model.process?.modelProvider ?? '',
      prompt: model.process?.prompt ?? '',
      searchEnabled: model.process?.searchEnabled,
      updatedAt: model.process?.updatedAt,
    },
    cells: [], // TODO: Cells should be loaded separately and this attribute should be removed
  };
};

export const getDatasetColumns = async (dataset: {
  id: string;
  name: string;
}): Promise<Column[]> => {
  const models = await ColumnModel.findAll({
    where: {
      datasetId: dataset.id,
    },
    include: [
      ColumnModel.associations.dataset,
      {
        association: ColumnModel.associations.process,
        include: [ProcessModel.associations.referredColumns],
      },
    ],
  });

  const updatedModels = await Promise.all(
    models.map(async (model) => {
      if (model.process) return model;

      model.numberOfCells = await countDatasetTableRows({
        dataset: model.dataset,
      });

      return model;
    }),
  );

  return updatedModels.map(modelToColumn);
};

export const listColumnsByIds = async (ids: string[]): Promise<Column[]> => {
  const models = await ColumnModel.findAll({
    where: {
      id: ids,
    },
    include: [
      ColumnModel.associations.dataset,
      {
        association: ColumnModel.associations.process,
        include: [ProcessModel.associations.referredColumns],
      },
    ],
  });

  const updatedModels = await Promise.all(
    models.map(async (model) => {
      if (model.process) return model;

      model.numberOfCells = await countDatasetTableRows({
        dataset: model.dataset,
      });

      return model;
    }),
  );

  return updatedModels.map(modelToColumn);
};

export const getColumnById = async (id: string): Promise<Column | null> => {
  const model = await ColumnModel.findByPk(id, {
    include: [
      ColumnModel.associations.dataset,
      {
        association: ColumnModel.associations.process,
        include: [ProcessModel.associations.referredColumns],
      },
    ],
  });

  if (!model) return null;

  return modelToColumn(model);
};

export const createRawColumn = async (column: {
  id: string;
  name: string;
  type: string;
  kind: ColumnKind;
  dataset: { id: string; name: string; createdBy: string };
}): Promise<Column> => {
  const model = await ColumnModel.create({
    id: column.id,
    name: column.name,
    type: column.type,
    kind: column.kind,
    datasetId: column.dataset.id,
  });

  return {
    id: model.id,
    name: model.name,
    type: model.type,
    kind: model.kind as ColumnKind,
    dataset: column.dataset,
    visible: model.visible,
    numberOfCells: 0,
    cells: [],
  };
};

export const createColumn = async (column: CreateColumn): Promise<Column> => {
  const model = await ColumnModel.create({
    name: column.name,
    type: column.type,
    kind: column.kind,
    datasetId: column.dataset.id,
  });

  await createDatasetTableColumn({
    dataset: column.dataset,
    column: model,
  });

  const process = column.process
    ? await createProcess({
        process: column.process,
        column: { id: model.id },
      })
    : undefined;

  const newbie: Column = {
    id: model.id,
    name: model.name,
    type: model.type,
    kind: model.kind as ColumnKind,
    dataset: column.dataset,
    visible: model.visible,
    process,
    cells: [],
    numberOfCells: 0,
  };

  return newbie;
};

export const updateColumn = async (column: Column): Promise<Column> => {
  await updateColumnPartially(column);

  if (column.process) column.process = await updateProcess(column.process);

  return (await getColumnById(column.id))!;
};

export const updateColumnPartially = async (
  column: Partial<Column> & { id: Column['id'] },
) => {
  const model = await ColumnModel.findByPk(column.id);

  if (!model) throw new Error('Column not found');

  model.set({ ...column });
  // TODO: if type changes, we need to update the table column type
  // await updateDatasetTableColumn({ column, type: column.type });

  await model.save();
};

export const getGeneratedColumnSize = async (
  columnId: string,
): Promise<number> => {
  return await getGeneratedCellsCount({ columnId });
};

export const getMaxRowIdxByColumnId = async (
  columnId: string,
): Promise<number> => {
  return await getMaxCellIdxByColumnId(columnId);
};

export const deleteColumn = async (columnId: string): Promise<void> => {
  const model = await ColumnModel.findByPk(columnId);

  if (!model) throw new Error('Column not found');

  await model.destroy();
};
