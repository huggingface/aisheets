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
    generating: model.generating,
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
    generating: model.generating,
  };
};

export const getColumnCells = async ({
  column,
  conditions,
  offset,
  limit,
}: {
  column: {
    id: string;
  };
  conditions?: Record<string, any>;
  offset?: number;
  limit?: number;
}): Promise<Cell[]> => {
  const models = await ColumnCellModel.findAll({
    where: {
      columnId: column.id,
      ...conditions,
    },
    limit,
    offset,
    order: [
      ['idx', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  return models.map((cell) => ({
    id: cell.id,
    idx: cell.idx,
    value: cell.value,
    error: cell.error,
    validated: cell.validated,
    column,
    updatedAt: cell.updatedAt,
    generating: cell.generating,
  }));
};

export const createCell = async ({
  cell,
  columnId,
}: {
  cell: Omit<Cell, 'id' | 'validated' | 'updatedAt' | 'generating'>;
  columnId: string;
}): Promise<Cell> => {
  const model = await ColumnCellModel.create({
    ...cell,
    generating: false,
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
    generating: model.generating,
  };
};

export const updateCell = async (cell: Partial<Cell>): Promise<Cell> => {
  let model = await ColumnCellModel.findByPk(cell.id!);

  if (!model) throw new Error('Cell not found');

  const updatedCell = Object.fromEntries(
    Object.entries(cell).map(([key, value]) => {
      if (value === undefined) return [key, null];
      return [key, value];
    }),
  );

  model.set({ ...updatedCell });
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
    generating: model.generating,
  };
};

export const getCellsCount = async (
  filter: Record<string, any>,
): Promise<number> => {
  return ColumnCellModel.count({
    where: filter,
  });
};
