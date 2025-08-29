import { afterEach, describe, expect, it } from 'vitest';
import { ColumnCellModel } from '~/services/db/models/cell';
import { ColumnModel } from '~/services/db/models/column';
import { DatasetModel } from '~/services/db/models/dataset';
import { getRowCells } from '~/services/repository/cells';

afterEach(async () => {
  await DatasetModel.destroy({ where: {} });
  await ColumnCellModel.destroy({ where: {} });
  await ColumnModel.destroy({ where: {} });
});

describe('getRowCells', () => {
  it('should return an empty array for a non-existing row idx', async () => {
    const dataset = await DatasetModel.create({
      name: 'Test Dataset',
      createdBy: 'test',
    });

    const column = await ColumnModel.create({
      name: 'Test Column',
      type: 'text',
      kind: 'static',
      datasetId: dataset.id,
    });

    await ColumnCellModel.create({
      idx: 1,
      columnId: column.id,
    });

    const cells = await getRowCells({ rowIdx: 2, columns: [column.id] });
    expect(cells).toEqual([]);
  });

  it('should return an array of cells for a given row', async () => {
    const dataset = await DatasetModel.create({
      name: 'Test Dataset',
      createdBy: 'test',
    });

    const columns = await ColumnModel.bulkCreate([
      {
        name: 'Test Column',
        type: 'text',
        kind: 'static',
        datasetId: dataset.id,
      },
      {
        name: 'Test Column 2',
        type: 'number',
        kind: 'static',
        datasetId: dataset.id,
      },
      {
        name: 'Test Column 3',
        type: 'boolean',
        kind: 'static',
        datasetId: dataset.id,
      },
    ]);

    const idx = 1;

    await ColumnCellModel.bulkCreate([
      {
        idx,
        columnId: columns[0].id,
      },
      {
        idx,
        columnId: columns[1].id,
      },
      {
        idx,
        columnId: columns[2].id,
      },
      {
        idx: 2,
        columnId: columns[0].id,
      },
    ]);

    const rowCells = await getRowCells({
      rowIdx: idx,
      columns: columns.map((c) => c.id),
    });
    expect(rowCells).toHaveLength(3);

    expect(rowCells[0].column!).toBeDefined();
    expect(rowCells[1].column!).toBeDefined();
    expect(rowCells[2].column!).toBeDefined();
  });
});
