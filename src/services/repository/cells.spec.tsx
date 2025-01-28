import { afterEach, describe, expect, it } from 'vitest';
import { ColumnCellModel } from '~/services/db/models/cell';
import { ColumnModel } from '~/services/db/models/column';
import { getRowCells } from '~/services/repository/cells';

afterEach(async () => {
  await ColumnCellModel.destroy({ where: {} });
  await ColumnModel.destroy({ where: {} });
});

describe('getRowCells', () => {
  it('should return an empty array for a non-existing row idx', async () => {
    const column = await ColumnModel.create({
      name: 'Test Column',
      type: 'text',
      kind: 'static',
    });

    const cell = await ColumnCellModel.create({
      idx: 1,
      value: 'Test Row',
      columnId: column.id,
    });

    const cells = await getRowCells({ rowIdx: 2 });
    expect(cells).toEqual([]);
  });

  it('should return an array of cells for a given row', async () => {
    const columns = await ColumnModel.bulkCreate([
      {
        name: 'Test Column',
        type: 'text',
        kind: 'static',
      },
      {
        name: 'Test Column 2',
        type: 'number',
        kind: 'static',
      },
      {
        name: 'Test Column 3',
        type: 'boolean',
        kind: 'static',
      },
    ]);

    const idx = 1;

    const cells = await ColumnCellModel.bulkCreate([
      {
        idx,
        value: 'Test Row',
        columnId: columns[0].id,
      },
      {
        idx,
        value: '100',
        columnId: columns[1].id,
      },
      {
        idx,
        value: 'true',
        columnId: columns[2].id,
      },
      {
        idx: 2,
        value: 'Test Row with other values',
        columnId: columns[0].id,
      },
    ]);

    const rowCells = await getRowCells({ rowIdx: idx });
    expect(rowCells).toHaveLength(3);

    expect(rowCells[0].column!).toBeDefined();
    expect(rowCells[1].column!).toBeDefined();
    expect(rowCells[2].column!).toBeDefined();
  });
});
