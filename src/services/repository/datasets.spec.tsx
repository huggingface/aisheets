import { afterEach, describe, expect, it } from 'vitest';
import {
  ColumnCellModel,
  ColumnModel,
  DatasetModel,
} from '~/services/db/models';
import { listDatasetRows } from '~/services/repository/datasets';
import type { ColumnKind, ColumnType } from '~/state';

afterEach(async () => {
  await DatasetModel.destroy({ where: {} });
  await ColumnCellModel.destroy({ where: {} });
  await ColumnModel.destroy({ where: {} });
});

describe('listDatasetRows', () => {
  it('should return an empty array when no data', async () => {
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

    const rows = [];
    for await (const row of listDatasetRows({
      dataset: {
        id: dataset.id,
        name: dataset.name,
        createdBy: dataset.createdBy,
        columns: [
          {
            id: column.id,
            name: column.name,
            type: column.type as ColumnType,
            kind: column.kind as ColumnKind,
            visible: true,
            cells: [],
            dataset: {
              id: dataset.id,
              name: dataset.name,
              createdBy: dataset.createdBy,
            },
            process: null,
          },
        ],
      },
    })) {
      rows.push(row);
    }

    expect(rows).toEqual([]);
  });

  it('should return an array of row data', async () => {
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

    const expectedRows = 5;
    for (let i = 0; i < expectedRows; i++) {
      await ColumnCellModel.bulkCreate([
        {
          idx: i,
          value: 'Test Row',
          columnId: columns[0].id,
        },
        {
          idx: i,
          value: '100',
          columnId: columns[1].id,
        },
        {
          idx: i,
          value: 'true',
          columnId: columns[2].id,
        },
      ]);
    }

    const rows = [];
    for await (const row of await listDatasetRows({
      dataset: {
        id: dataset.id,
        name: dataset.name,
        createdBy: dataset.createdBy,
        columns: columns.map((column) => ({
          id: column.id,
          name: column.name,
          type: column.type as ColumnType,
          kind: column.kind as ColumnKind,
          visible: true,
          cells: [],
          dataset: {
            id: dataset.id,
            name: dataset.name,
            createdBy: dataset.createdBy,
          },
          process: null,
        })),
      },
    })) {
      rows.push(row);
    }

    expect(rows).toHaveLength(expectedRows);

    expect(rows[0]).toStrictEqual({
      idx: 0,
      'Test Column': 'Test Row',
      'Test Column 2': '100',
      'Test Column 3': 'true',
    });
    expect(rows[1]).toStrictEqual({
      idx: 1,
      'Test Column': 'Test Row',
      'Test Column 2': '100',
      'Test Column 3': 'true',
    });
    expect(rows[2]).toStrictEqual({
      idx: 2,
      'Test Column': 'Test Row',
      'Test Column 2': '100',
      'Test Column 3': 'true',
    });
    expect(rows[3]).toStrictEqual({
      idx: 3,
      'Test Column': 'Test Row',
      'Test Column 2': '100',
      'Test Column 3': 'true',
    });
    expect(rows[4]).toStrictEqual({
      idx: 4,
      'Test Column': 'Test Row',
      'Test Column 2': '100',
      'Test Column 3': 'true',
    });
  });

  it('should return an empty array for a dataset with no columns', async () => {
    const dataset = await DatasetModel.create({
      name: 'Test Dataset',
      createdBy: 'test',
    });

    const rows = [];
    for await (const row of listDatasetRows({
      dataset: {
        id: dataset.id,
        name: dataset.name,
        createdBy: dataset.createdBy,
        columns: [],
      },
    })) {
      rows.push(row);
    }

    expect(rows).toEqual([]);
  });
});
