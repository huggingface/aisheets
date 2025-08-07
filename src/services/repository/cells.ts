import { Op } from 'sequelize';
import { ColumnCellModel } from '~/services/db/models/cell';
import type { Cell, Column } from '~/state';

import {
  type CellSource,
  MAX_SOURCE_SNIPPET_LENGTH,
} from '~/services/db/models/cell';
import { ColumnModel } from '../db/models';
import { getColumnById, listColumnsByIds } from './columns';
import { listDatasetTableRows, upsertColumnValues } from './tables';
import { deleteDatasetTableRows } from './tables/delete-table-rows';

const rowDataToCells = (
  {
    rowIdx,
    rowData,
  }: {
    rowIdx: number;
    rowData: Record<string, any>;
  },
  column?: Column | ColumnModel,
): Cell[] => {
  return Object.entries(rowData).map(([columnId, cellValue]) => {
    return {
      idx: rowIdx,
      value: cellValue,
      column: {
        id: columnId,
        type: column?.type ?? '',
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
  cell.sources = model.sources;
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

  const cell = rowDataToCells(
    { rowIdx: model.idx, rowData: rows[0] },
    column,
  )[0];

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
    column?: { id: string; name: string };
    updatedAt: Date;
    generating: boolean;
  }[]
> => {
  const storedColumns = await listColumnsByIds(columns);
  if (storedColumns.length === 0) return [];

  const rows = await listDatasetTableRows({
    dataset: storedColumns[0].dataset,
    columns: columns!.map((id) => ({ id })),
    limit: 1,
    offset: rowIdx,
  });

  if (rows.length === 0) return [];

  const cells = rowDataToCells({ rowIdx, rowData: rows[0] }).map((cell) => ({
    ...cell,
    column: storedColumns.find((c) => c.id === cell.column!.id),
  }));

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

  const cell = rowDataToCells({ rowIdx: idx, rowData: rows[0] }, column)[0];

  const model = await ColumnCellModel.findOne({
    where: {
      idx,
      columnId,
    },
  });

  if (model) mergeCellWithModel({ cell, model });

  return cell;
};

export const getValidatedColumnCells = async ({
  column,
}: {
  column: {
    id: string;
  };
}): Promise<Cell[]> => {
  const dbColumn = await getColumnById(column.id);
  if (!dbColumn) throw new Error('Column not found');

  const models = await ColumnCellModel.findAll({
    where: {
      columnId: column.id,
      validated: true,
    },
    order: [
      ['idx', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  if (models.length === 0) return [];

  const offset = models[0].idx;

  const rows = await listDatasetTableRows({
    dataset: dbColumn.dataset,
    columns: [column],
    offset,
    limit: models[models.length - 1].idx - offset + 1,
  });

  const cells = models.map((model) => ({
    id: model.id,
    idx: model.idx,
    value: rows[model.idx - offset][column.id],
    error: model.error,
    validated: model.validated,
    column: {
      id: model.columnId,
      type: model.column?.type!,
    },
    updatedAt: model.updatedAt,
    generating: model.generating,
  }));

  return cells;
};

export const getColumnCells = async ({
  column,
  offset,
  limit,
}: {
  column: {
    id: string;
  };
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
    rowDataToCells({ rowIdx: (offset || 0) + idx, rowData }, dbColumn),
  );

  const storedCells = await ColumnCellModel.findAll({
    where: {
      columnId: column.id,
      idx: {
        [Op.gte]: offset || 0,
        [Op.lt]: (offset || 0) + (limit || rows.length),
      },
    },
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

function getLongestCommonPrefix(strings: string[]): string {
  if (!strings.length) return '';
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    let j = 0;
    while (
      j < prefix.length &&
      j < strings[i].length &&
      prefix[j] === strings[i][j]
    ) {
      j++;
    }
    prefix = prefix.slice(0, j);
    if (!prefix) break;
  }
  return prefix;
}

// Remove common prefix and truncate each snippet
function processSources(sources?: CellSource[]): CellSource[] | undefined {
  if (!sources || sources.length === 0) return sources;
  // Group sources by URL, preserving order of first appearance
  const urlOrder: string[] = [];
  const grouped: Record<string, CellSource[]> = {};
  for (const source of sources) {
    if (!grouped[source.url]) {
      grouped[source.url] = [];
      urlOrder.push(source.url);
    }
    grouped[source.url].push(source);
  }
  // Process each group
  const processed: CellSource[] = [];
  for (const url of urlOrder) {
    const group = grouped[url];
    const snippets = group.map((s) => s.snippet);
    const allIdentical = snippets.every((s) => s === snippets[0]);
    if (allIdentical) {
      processed.push({
        ...group[0],
        snippet: snippets[0].slice(0, MAX_SOURCE_SNIPPET_LENGTH),
      });
      continue;
    }
    const prefix = getLongestCommonPrefix(snippets);
    for (const source of group) {
      const tail = source.snippet.slice(prefix.length).trim();
      processed.push({
        ...source,
        snippet: tail.slice(0, MAX_SOURCE_SNIPPET_LENGTH),
      });
    }
  }
  return processed;
}

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
    value: cell.value,
    error: model.error,
    validated: model.validated,
    column: {
      id: column.id,
      type: column.type!,
    },
    updatedAt: model.updatedAt,
    generating: model.generating,
    sources: model.sources,
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

  const updatedCell = Object.fromEntries(
    Object.entries(cell).map(([key, value]) => {
      if (value === undefined) return [key, null];
      return [key, value];
    }),
  );

  if (updatedCell.sources) {
    updatedCell.sources = processSources(updatedCell.sources);
  }
  model.set({ ...updatedCell });
  model = await model.save();

  return {
    id: model.id,
    idx: model.idx,
    value: cell.value,
    error: model.error,
    validated: model.validated,
    column: {
      id: model.columnId,
      type: model.column?.type!,
    },
    updatedAt: model.updatedAt,
    generating: model.generating,
    sources: model.sources,
  };
};

export const deleteRowsCells = async (
  datasetId: string,
  rowIdxs: number[],
): Promise<boolean> => {
  rowIdxs = rowIdxs.sort((a, b) => b - a);

  const columns = await ColumnModel.findAll({
    where: {
      datasetId,
    },
  });

  await ColumnCellModel.destroy({
    where: {
      columnId: {
        [Op.in]: columns.map((column) => column.id),
      },
      idx: {
        [Op.in]: rowIdxs,
      },
    },
  });

  for (const rowIdx of rowIdxs) {
    await ColumnCellModel.decrement('idx', {
      by: 1,
      where: {
        columnId: {
          [Op.in]: columns.map((column) => column.id),
        },
        idx: { [Op.gt]: rowIdx },
      },
    });
  }

  const deletedRows = await deleteDatasetTableRows({
    dataset: {
      id: datasetId,
    },
    rowIdxs,
  });

  return deletedRows === rowIdxs.length;
};

export const getGeneratedCellsCount = async (
  filter: Record<string, any>,
): Promise<number> => {
  return ColumnCellModel.count({
    where: filter,
  });
};

export const getMaxCellIdxByColumnId = async (
  columnId: string,
): Promise<number> => {
  return ColumnCellModel.max('idx', {
    where: { columnId },
  });
};
