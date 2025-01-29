import { ColumnModel } from '~/services/db/models/column';
import { ProcessModel } from '~/services/db/models/process';
import type { Cell, Column, Process } from '~/state';

export const listColumns = async (
  params = {} as Record<string, any>,
): Promise<Column[]> => {
  const columns = await ColumnModel.findAll({
    where: params,
    include: [ColumnModel.associations.cells, ColumnModel.associations.dataset],
    order: [['createdAt', 'ASC']],
  });

  return columns.map((column) => ({
    id: column.id,
    name: column.name,
    type: column.type,
    kind: column.kind,
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
    })),
  }));
};

export const getAllColumns = async (datasetId: string): Promise<Column[]> => {
  const columns = await ColumnModel.findAll({
    include: [ColumnModel.associations.cells, ColumnModel.associations.dataset],
    order: [['createdAt', 'ASC']],
    where: {
      datasetId,
    },
  });

  return columns.map((column) => ({
    id: column.id,
    name: column.name,
    type: column.type,
    kind: column.kind,

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
    })),
  }));
};

export const addColumn = async (
  column: Omit<Column, 'id' | 'cells'>,
  process?: Process,
) => {
  const cells: Cell[] = [];

  const addedColumn = await ColumnModel.create({
    name: column.name,
    type: column.type,
    kind: column.kind,
    datasetId: column.dataset.id,
  });

  if (process) {
    ProcessModel.create({
      limit: process.limit,
      modelName: process.modelName,
      offset: process.offset,
      prompt: process.prompt,
      columnId: addedColumn.id,
    });
  }

  const handler = {
    addCell: async (cell: Omit<Cell, 'id'>) => {
      const newbie = await addedColumn.createCell({
        idx: cell.idx,
        value: cell.value ?? '',
        error: cell.error ?? '',
      });

      cells.push(newbie);
    },
    id: addedColumn.id,
    name: addedColumn.name,
    type: addedColumn.type,
    kind: addedColumn.kind,
    dataset: column.dataset,
    cells,
    process,
  };

  return handler;
};
