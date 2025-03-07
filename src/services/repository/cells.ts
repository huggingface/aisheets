import { Op } from 'sequelize';
import { ColumnCellModel } from '~/services/db/models/cell';
import type { Cell } from '~/state';
import { ColumnModel } from '../db/models';
import { getColumnById } from './columns';
import { listDatasetTableRows, upsertColumnValues } from './tables';

const rowDataToCells = ({
  rowIdx,
  rowData,
}: {
  rowIdx: number;
  rowData: Record<string, any>;
}): Cell[] => {
  return Object.entries(rowData).map(([columnId, cellValue]) => {
    return {
      idx: rowIdx,
      value: cellValue,
      column: {
        id: columnId,
      },
      // default values
      id: undefined, // review this and probably let the id be undefined
      error: undefined as string | undefined,
      validated: false,
      updatedAt: new Date(),
      generating: false,
    };
  });
};

const mergeCellWithModel = ({
  cell,
  model,
}: {
  cell: Cell;
  model: ColumnCellModel;
}): Cell => {
  cell.id = model.id;
  cell.error = model.error;
  cell.validated = model.validated;
  cell.updatedAt = model.updatedAt;
  cell.generating = model.generating;

  return cell;
};

interface GetRowCellsParams {
  rowIdx: number;
  columns: string[];
}

export const getColumnCellById = async (id: string): Promise<Cell | null> => {
  const model = await ColumnCellModel.findByPk(id, {
    include: [
      {
        association: ColumnCellModel.associations.column,
        include: [ColumnModel.associations.dataset],
      },
    ],
  });

  if (!model) return null;

  const column = model.column!;
  const rows = await listDatasetTableRows({
    dataset: column.dataset,
    columns: [column],
    limit: 1,
    offset: model.idx,
  });

  const cell = rowDataToCells({ rowIdx: model.idx, rowData: rows[0] })[0];

  return mergeCellWithModel({ cell, model });
};

export const getRowCells = async ({
  rowIdx,
  columns,
}: GetRowCellsParams): Promise<
  {
    id?: string;
    idx: number;
    value?: string | undefined;
    error?: string | undefined;
    validated: boolean;
    column?: { id: string; name?: string };
    updatedAt: Date;
    generating: boolean;
  }[]
> => {
  const column = await getColumnById(columns[0]);

  const rows = await listDatasetTableRows({
    dataset: column!.dataset,
    columns: columns!.map((id) => ({ id })),
    limit: 1,
    offset: rowIdx,
  });

  if (rows.length === 0) return [];

  const cells = rowDataToCells({ rowIdx, rowData: rows[0] });

  const storedCells = await ColumnCellModel.findAll({
    where: {
      [Op.and]: [{ idx: rowIdx }, columns ? { columnId: columns } : {}],
    },
    include: {
      association: ColumnCellModel.associations.column,
    },
    order: [['createdAt', 'ASC']],
  });

  for (const cellModel of storedCells) {
    const cell = cells.find((c) => c.column?.id === cellModel.columnId);
    if (cell) mergeCellWithModel({ cell, model: cellModel });
  }

  return cells;
};

export const getColumnCellByIdx = async ({
  columnId,
  idx,
}: {
  columnId: string;
  idx: number;
}): Promise<Cell | null> => {
  const column = await getColumnById(columnId);
  if (!column) return null;

  const rows = await listDatasetTableRows({
    dataset: column.dataset,
    columns: [column],
    limit: 1,
    offset: idx,
  });

  if (rows.length === 0) return null;

  const cell = rowDataToCells({ rowIdx: idx, rowData: rows[0] })[0];

  const model = await ColumnCellModel.findOne({
    where: {
      idx,
      columnId,
    },
  });

  if (model) mergeCellWithModel({ cell, model });

  return cell;
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
  const dbColumn = await getColumnById(column.id);
  if (!dbColumn) throw new Error('Column not found');

  const rows = await listDatasetTableRows({
    dataset: dbColumn.dataset,
    columns: [dbColumn],
    limit,
    offset,
  });

  if (rows.length === 0) return [];

  const cells = rows.map((rowData, idx) =>
    rowDataToCells({ rowIdx: (offset || 0) + idx, rowData }),
  );

  const storedCells = await ColumnCellModel.findAll({
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

  for (const cellModel of storedCells) {
    const batchIdx = cellModel.idx - (offset || 0);
    const cell = cells[batchIdx].find(
      (c) => c.column?.id === cellModel.columnId,
    );

    if (cell) mergeCellWithModel({ cell, model: cellModel });
  }

  return cells.flat();
};

export const createCell = async ({
  cell,
  columnId,
}: {
  cell: Omit<Cell, 'id' | 'validated' | 'updatedAt' | 'generating'>;
  columnId: string;
}): Promise<Cell> => {
  const column = await getColumnById(columnId);
  if (!column) throw new Error('Column not found');

  await upsertColumnValues({
    dataset: column.dataset,
    column,
    values: [[cell.idx, cell.value]],
  });

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

  const column = await getColumnById(model.columnId);
  if (!column) throw new Error('Column not found');

  await upsertColumnValues({
    dataset: column.dataset,
    column,
    values: [[model.idx, cell.value]],
  });

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
    generating: model.generating,
  };
};
