import { Op } from 'sequelize';
import { ColumnCellModel } from '~/services/db/models/cell';
import type { Cell, Column } from '~/state';

interface GetRowCellsParams {
  rowIdx: number;
  columns?: string[];
}

export const getRowCells = async ({
  rowIdx,
  columns,
}: GetRowCellsParams): Promise<ColumnCellModel[]> => {
  const models = await ColumnCellModel.findAll({
    where: {
      [Op.and]: [{ idx: rowIdx }, columns ? { columnId: columns } : {}],
    },
    include: {
      association: ColumnCellModel.associations.column,
    },
    order: [['createdAt', 'ASC']],
  });

  return models;
};

export const getColumnCellByIdx = async ({
  column,
  idx,
}: {
  column: Column;
  idx: number;
}): Promise<Cell | null> => {
  const model = await ColumnCellModel.findOne({
    where: {
      idx,
      columnId: column.id,
    },
  });

  if (!model) {
    return null;
  }

  return {
    id: model.id,
    idx: model.idx,
    value: model.value,
    error: model.error,
    validated: model.validated,
    updatedAt: model.updatedAt,
    column,
  };
};

export const getColumnCells = async ({
  column,
  conditions,
}: {
  column: Column;
  conditions?: Record<string, any>;
}): Promise<Cell[]> => {
  const models = await ColumnCellModel.findAll({
    where: {
      columnId: column.id,
      ...conditions,
    },
    order: [['createdAt', 'ASC']],
  });

  return models.map((cell) => ({
    id: cell.id,
    idx: cell.idx,
    value: cell.value,
    error: cell.error,
    validated: cell.validated,
    columnId: cell.columnId,
    updatedAt: cell.updatedAt,
    column,
  }));
};

export const createCell = async ({
  cell,
  column,
}: {
  cell: Omit<Cell, 'id' | 'validated' | 'updatedAt'>;
  column: Column;
}): Promise<Cell> => {
  const model = await ColumnCellModel.create({ ...cell, columnId: column.id });

  return {
    id: model.id,
    idx: model.idx,
    value: model.value,
    error: model.error,
    validated: model.validated,
    updatedAt: model.updatedAt,
    column,
  };
};

export const updateCell = async (cell: Partial<Cell>): Promise<Cell> => {
  let model = await ColumnCellModel.findByPk(cell.id!);

  if (!model) {
    throw new Error('Cell not found');
  }

  model.set({ ...cell });
  model = await model.save();

  return {
    id: model.id,
    idx: model.idx,
    value: model.value,
    error: model.error,
    validated: model.validated,
    updatedAt: model.updatedAt,
    column: cell.column,
  };
};
