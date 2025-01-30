import { ColumnModel } from '~/services/db/models/column';
import { ProcessModel } from '~/services/db/models/process';
import type { Cell, Column, Process } from '~/state';

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
      validated: cell.validated,
      columnId: cell.columnId,
      updatedAt: cell.updatedAt,
    })),

    process: {
      columnsReferences: column.process?.columnsReferences ?? [],
      limit: column.process?.limit ?? 0,
      modelName: column.process?.modelName ?? '',
      offset: column.process?.offset ?? 0,
      prompt: column.process?.prompt ?? '',
    },
  }));
};

export const getColumnById = async (id: string): Promise<Column | null> => {
  const column = await ColumnModel.findByPk(id, {
    include: [ColumnModel.associations.cells, 'process'],
  });

  if (!column) return null;

  return {
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
      validated: cell.validated,
      columnId: cell.columnId,
      updatedAt: cell.updatedAt,
    })),

    process: {
      columnsReferences: column.process?.columnsReferences ?? [],
      limit: column.process?.limit ?? 0,
      modelName: column.process?.modelName ?? '',
      offset: column.process?.offset ?? 0,
      prompt: column.process?.prompt ?? '',
    },
  };
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
    await ProcessModel.create({
      limit: process.limit,
      modelName: process.modelName,
      offset: process.offset,
      prompt: process.prompt,
      columnId: addedColumn.id,
    });
  }

  const handler: Column & {
    addCell: (
      cell: Omit<Cell, 'id' | 'validated' | 'columnId' | 'updatedAt'>,
    ) => Promise<Cell>;
  } = {
    addCell: async (
      cell: Omit<Cell, 'id' | 'validated' | 'columnId' | 'updatedAt'>,
    ): Promise<Cell> => {
      const newbie = await addedColumn.createCell({
        idx: cell.idx,
        value: cell.value ?? '',
        error: cell.error ?? '',
      });

      cells.push(newbie);

      return {
        id: newbie.id,
        idx: newbie.idx,
        value: newbie.value,
        error: newbie.error,
        validated: newbie.validated,
        columnId: newbie.columnId,
        updatedAt: newbie.updatedAt,
      };
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
