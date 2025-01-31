import { Op } from 'sequelize';
import { ColumnCellModel } from '~/services/db/models/cell';
import { ColumnModel } from '~/services/db/models/column';
import type { Cell } from '~/state';

interface GetRowCellsParams {
  rowIdx: number;
  columns?: string[];
}

export const getRowCells = async ({
  rowIdx,
  columns,
}: GetRowCellsParams): Promise<Cell[]> => {
  const models = await ColumnCellModel.findAll({
    where: {
      [Op.and]: [{ idx: rowIdx }, columns ? { columnId: columns } : {}],
    },
    order: [['createdAt', 'ASC']],
    include: {
      as: 'column',
      model: ColumnModel,
    },
  });

  return models.map((model) => ({
    id: model.id,
    idx: model.idx,
    value: model.value,
    error: model.error,
    validated: model.validated,
    columnId: model.columnId,
    updatedAt: model.updatedAt,
  }));
};

export const getCellByIdxAndColumnId = async ({
  idx,
  columnId,
}: {
  idx: number;
  columnId: string;
}): Promise<Cell | null> => {
  const model = await ColumnCellModel.findOne({
    where: {
      idx,
      columnId,
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
    columnId: model.columnId,
    updatedAt: model.updatedAt,
  };
};

export const getColumnCells = async (
  columnId: string,
  conditions?: any,
): Promise<Cell[]> => {
  const models = await ColumnCellModel.findAll({
    where: {
      columnId,
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
  }));
};

export const createCell = async (
  cell: Omit<Cell, 'id' | 'validated' | 'updatedAt'>,
): Promise<Cell> => {
  const model = await ColumnCellModel.create({ ...cell });

  return {
    id: model.id,
    idx: model.idx,
    value: model.value,
    error: model.error,
    validated: model.validated,
    columnId: model.columnId,
    updatedAt: model.updatedAt,
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
    columnId: model.columnId,
    updatedAt: model.updatedAt,
  };
};
