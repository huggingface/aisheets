import { ColumnModel } from '~/services/db/models/column';
import { ProcessModel } from '~/services/db/models/process';
import type { Column, ColumnKind, ColumnType, CreateColumn } from '~/state';
import { getCellsCount } from './cells';
import { createProcess, updateProcess } from './processes';
import { createDatasetTableColumn } from './tables';

export const modelToColumn = (model: ColumnModel): Column => {
  return {
    id: model.id,
    name: model.name,
    type: model.type as ColumnType,
    kind: model.kind as ColumnKind,
    visible: model.visible,

    dataset: {
      id: model.dataset.id,
      name: model.dataset.name,
      createdBy: model.dataset.createdBy,
    },

    process: {
      id: model.process?.id,
      columnsReferences: (model.process?.referredColumns ?? []).map(
        (columnRef) => columnRef.id,
      ),
      limit: model.process?.limit ?? 0,
      modelName: model.process?.modelName ?? '',
      modelProvider: model.process?.modelProvider ?? '',
      offset: model.process?.offset ?? 0,
      prompt: model.process?.prompt ?? '',
      updatedAt: model.process?.updatedAt,
    },
    cells: // TODO: Cells should be loaded separately and this attribute should be removed
      model.cells?.map((cell) => ({
        id: cell.id,
        validated: cell.validated,
        column: {
          id: cell.columnId,
        },
        updatedAt: cell.updatedAt,
        generating: cell.generating,
        idx: cell.idx,
      })) ?? [],
  };
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

  return models.map(modelToColumn);
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
  type: ColumnType;
  kind: ColumnKind;
  dataset: { id: string; name: string; createdBy: string };
}): Promise<Column> => {
  const model = await ColumnModel.create({
    id: column.id,
    name: column.name,
    type: column.type,
    kind: column.kind,
    datasetId: column.dataset!.id,
  });

  return {
    id: model.id,
    name: model.name,
    type: model.type as ColumnType,
    kind: model.kind as ColumnKind,
    dataset: column.dataset,
    visible: model.visible,
    process: null,
    cells: [],
  };
};

export const createColumn = async (column: CreateColumn): Promise<Column> => {
  const model = await ColumnModel.create({
    name: column.name,
    type: column.type,
    kind: column.kind,
    datasetId: column.dataset!.id,
  });

  await createDatasetTableColumn({
    dataset: column.dataset,
    column: model,
  });

  const process = column.process ? await createProcess(column, model.id) : null;

  const newbie: Column = {
    id: model.id,
    name: model.name,
    type: model.type as ColumnType,
    kind: model.kind as ColumnKind,
    dataset: column.dataset,
    visible: model.visible,
    process,
    cells: [],
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

export const getColumnSize = async (column: Column): Promise<number> => {
  return await getCellsCount({ columnId: column.id });
};
