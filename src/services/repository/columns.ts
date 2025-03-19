import { ColumnModel } from '~/services/db/models/column';
import { ProcessModel } from '~/services/db/models/process';
import type { Column, ColumnKind, ColumnType, CreateColumn } from '~/state';
import { getCellsCount } from './cells';
import { createProcess, updateProcess } from './processes';

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

    numberOfCells: model.numberOfCells,

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

    cells:
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

export const getColumnById = async (id: string): Promise<Column | null> => {
  const model = await ColumnModel.findByPk(id, {
    include: [
      {
        association: ColumnModel.associations.process,
        include: [ProcessModel.associations.referredColumns],
      },
      {
        association: ColumnModel.associations.dataset,
      },
    ],
  });

  if (!model) return null;

  return modelToColumn(model);
};

export const createColumn = async (column: CreateColumn): Promise<Column> => {
  const model = await ColumnModel.create({
    name: column.name,
    type: column.type,
    kind: column.kind,
    datasetId: column.dataset!.id,
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
    type: model.type as ColumnType,
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
  let model = await ColumnModel.findByPk(column.id);

  if (!model) {
    throw new Error('Column not found');
  }

  model.set({
    name: column.name,
    type: column.type,
    kind: column.kind,
  });

  model = await model.save();

  if (column.process) {
    column.process = await updateProcess(column.process);
  }

  return {
    id: model.id,
    name: model.name,
    type: model.type as ColumnType,
    kind: model.kind as ColumnKind,
    visible: model.visible,
    dataset: column.dataset,
    process: column.process,
    cells: column.cells,
    numberOfCells: model.numberOfCells,
  };
};

export const updateColumnPartially = async (
  column: Partial<Column> & { id: Column['id'] },
) => {
  const model = await ColumnModel.findByPk(column.id);

  if (!model) {
    throw new Error('Column not found');
  }

  model.set({
    ...column,
  });

  await model.save();
};

export const getColumnSize = async (column: Column): Promise<number> => {
  return await getCellsCount({ columnId: column.id });
};
