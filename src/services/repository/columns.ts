import { ColumnModel } from '~/services/db/models/column';
import { ProcessModel } from '~/services/db/models/process';
import type { Column, ColumnKind, ColumnType } from '~/state';
import { createProcess, updateProcess } from './processes';

export const getDatasetColumns = async (
  datasetId: string,
): Promise<Column[]> => {
  const models = await ColumnModel.findAll({
    where: {
      datasetId,
    },
    include: [
      {
        association: ColumnModel.associations.cells,
        separate: true,
        order: [['idx', 'ASC']],
      },
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

  return models.map((column) => ({
    id: column.id,
    name: column.name,
    type: column.type as ColumnType,
    kind: column.kind as ColumnKind,

    dataset: {
      id: column.dataset.id,
      name: column.dataset.name,
      createdBy: column.dataset.createdBy,
    },

    cells: column.cells.map((cell) => ({
      id: cell.id,
      idx: cell.idx,
      value: cell.value,
      error: cell.error,
      validated: cell.validated,
      columnId: cell.columnId,
      updatedAt: cell.updatedAt,
    })),

    process: {
      id: column.process?.id,
      columnsReferences: (column.process?.referredColumns ?? []).map(
        (column) => column.id,
      ),
      limit: column.process?.limit ?? 0,
      modelName: column.process?.modelName ?? '',
      offset: column.process?.offset ?? 0,
      prompt: column.process?.prompt ?? '',
    },
  }));
};

export const getColumnById = async (id: string): Promise<Column | null> => {
  const model = await ColumnModel.findByPk(id, {
    include: [
      {
        association: ColumnModel.associations.cells,
        separate: true,
        order: [['idx', 'ASC']],
      },
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

    cells: model.cells.map((cell) => ({
      id: cell.id,
      idx: cell.idx,
      value: cell.value,
      error: cell.error,
      validated: cell.validated,
      columnId: cell.columnId,
      updatedAt: cell.updatedAt,
    })),

    process: {
      id: model.process?.id,
      columnsReferences: (model.process?.referredColumns ?? []).map(
        (column) => column.id,
      ),
      limit: model.process?.limit ?? 0,
      modelName: model.process?.modelName ?? '',
      offset: model.process?.offset ?? 0,
      prompt: model.process?.prompt ?? '',
    },
  };
};

export const createColumn = async (
  column: Omit<Column, 'id' | 'cells'>,
): Promise<Column> => {
  const model = await ColumnModel.create({
    name: column.name,
    type: column.type,
    kind: column.kind,
    datasetId: column.dataset.id,
  });

  const newColumn = {
    id: model.id,
    name: model.name,
    type: model.type as ColumnType,
    kind: model.kind as ColumnKind,
    dataset: column.dataset,
    process: column.process,
    cells: [], // TODO: review this assigment
  };

  if (column.process) {
    newColumn.process = await createProcess({
      process: column.process,
      column: newColumn,
    });
  }

  return newColumn;
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
