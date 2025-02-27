import { Op } from 'sequelize';
import { ColumnCellModel } from '~/services/db/models/cell';
import type { Cell } from '~/state';

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
  columnId,
  idx,
}: {
  columnId: string;
  idx: number;
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
    column: {
      id: model.columnId,
    },
    updatedAt: model.updatedAt,
    generated: model.generated,
  };
};

export const getColumnCellById = async (id: string): Promise<Cell | null> => {
  const model = await ColumnCellModel.findByPk(id);

  if (!model) {
    return null;
  }

  return {
    id: model.id,
    idx: model.idx,
    value: model.value,
    error: model.error,
    validated: model.validated,
    column: {
      id: model.columnId,
    },
    updatedAt: model.updatedAt,
    generated: model.generated,
  };
};

export const getColumnCells = async ({
  columnId,
  conditions,
}: {
  columnId: string;
  conditions?: Record<string, any>;
}): Promise<Cell[]> => {
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
    column: {
      id: cell.columnId,
    },
    columnId: cell.columnId,
    updatedAt: cell.updatedAt,
    generated: cell.generated,
  }));
};

export const createCell = async ({
  cell,
  columnId,
}: {
  cell: Omit<Cell, 'id' | 'validated' | 'updatedAt' | 'generated'>;
  columnId: string;
}): Promise<Cell> => {
  const model = await ColumnCellModel.create({
    ...cell,
    generated: false,
    columnId,
  });

  return {
    id: model.id,
    idx: model.idx,
    value: model.value,
    error: model.error,
    validated: model.validated,
    column: {
      id: model.columnId,
    },
    updatedAt: model.updatedAt,
    generated: model.generated,
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
    column: {
      id: model.columnId,
    },
    updatedAt: model.updatedAt,
    generated: model.generated,
  };
};
