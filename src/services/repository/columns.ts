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

  return models.map((model) => {
    const column = {
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
        offset: model.process?.offset ?? 0,
        prompt: model.process?.prompt ?? '',
      },
      cells: [],
    };

    return {
      ...column,
      cells: model.cells.map((cell) => ({
        id: cell.id,
        idx: cell.idx,
        value: cell.value,
        error: cell.error,
        validated: cell.validated,
        updatedAt: cell.updatedAt,
        column,
      })),
    };
  });
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

  const column = {
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
      offset: model.process?.offset ?? 0,
      prompt: model.process?.prompt ?? '',
    },

    cells: [],
  };

  return {
    ...column,
    cells: model.cells.map((cell) => ({
      id: cell.id,
      idx: cell.idx,
      value: cell.value,
      error: cell.error,
      validated: cell.validated,
      updatedAt: cell.updatedAt,
      column,
    })),
  };
};

export const createColumn = async (
  column: Omit<Column, 'id' | 'cells'>,
): Promise<Column> => {
  const model = await ColumnModel.create({
    name: column.name,
    type: column.type,
    kind: column.kind,
    datasetId: column.dataset!.id,
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
