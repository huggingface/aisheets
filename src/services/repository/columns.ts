import { ColumnModel } from '~/services/db/models/column';
import { ProcessModel } from '~/services/db/models/process';
import type { Column, ColumnKind, ColumnType, CreateColumn } from '~/state';
import { createProcess, updateProcess } from './processes';

export const modelToColumn = (model: ColumnModel): Column => {
  return {
    id: model.id,
    name: model.name,
    type: model.type as ColumnType,
    kind: model.kind as ColumnKind,

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

export const getDatasetColumns = async (
  datasetId: string,
): Promise<Column[]> => {
  const models = await ColumnModel.findAll({
    where: {
      datasetId,
    },
    include: [
      {
        association: ColumnModel.associations.process,
        include: [ProcessModel.associations.referredColumns],
      },
      {
        association: ColumnModel.associations.dataset,
      },
    ],
    order: [['createdAt', 'ASC']],
  });

  return models.map((model) => {
    const column = modelToColumn(model);

    // Partially cell loading
    return {
      ...column,
      cells: model.cells.map((cell) => ({
        id: cell.id,
        idx: cell.idx,
        column: {
          id: column.id,
        },
        updatedAt: cell.updatedAt,
        generating: cell.generating,
        validated: cell.validated,
      })),
    };
  });
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

  return {
    id: model.id,
    name: model.name,
    type: model.type as ColumnType,
    kind: model.kind as ColumnKind,

    dataset: {
      id: model.dataset.id,
      name: model.dataset.name,
      createdBy: model.dataset.createdBy,
    },

    process: {
      id: model.process?.id,
      columnsReferences: (model.process?.referredColumns ?? []).map(
        (column) => column.id,
      ),
      limit: model.process?.limit ?? 0,
      modelName: model.process?.modelName ?? '',
      modelProvider: model.process?.modelProvider ?? '',
      offset: model.process?.offset ?? 0,
      prompt: model.process?.prompt ?? '',
      updatedAt: model.process?.updatedAt,
    },

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

  const process = await createProcess(column, model.id);

  const newbie: Column = {
    id: model.id,
    name: model.name,
    type: model.type as ColumnType,
    kind: model.kind as ColumnKind,
    dataset: column.dataset,
    process,
    cells: [],
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
    dataset: column.dataset,
    process: column.process,
    cells: column.cells,
  };
};

export const updateColumnName = async (columnId: string, newName: string) => {
  const model = await ColumnModel.findByPk(columnId);

  if (!model) {
    throw new Error('Column not found');
  }

  model.set({
    name: newName,
  });

  await model.save();
};
