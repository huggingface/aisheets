import { ColumnModel } from '~/services/db/models/column';
import { ProcessModel } from '~/services/db/models/process';
import type { Column, ColumnKind, ColumnType, CreateColumn } from '~/state';
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
        generating: cell.generating,
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
    visible: model.visible,

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

  return {
    ...column,
    cells: model.cells.map((cell) => ({
      id: cell.id,
      idx: cell.idx,
      value: cell.value,
      error: cell.error,
      validated: cell.validated,
      updatedAt: cell.updatedAt,
      generating: cell.generating,
      column,
    })),
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
    visible: model.visible,
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
    visible: model.visible,
    dataset: column.dataset,
    process: column.process,
    cells: column.cells,
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
