import { afterEach, describe, expect, it } from 'vitest';

import { randomUUID } from 'node:crypto';
import { connectAndClose } from '~/services/db/duckdb';
import { createDatasetTable } from './create-table';
import { deleteDatasetTable } from './delete-table';
import { upsertColumnValues } from './insert-column-values';
import { getColumnName, getDatasetTableName } from './utils';

const dataset = {
  id: randomUUID(),
  name: 'Test Dataset',
  createdBy: 'test-user',
};

afterEach(async () => {
  await deleteDatasetTable(dataset);
});

describe('insert-column-values', () => {
  it('should insert values from a generator function', async () => {
    const column = {
      id: 'test-column',
      name: 'Test Column',
      type: 'VARCHAR',
    };

    await createDatasetTable({
      dataset,
      columns: [column],
    });

    await upsertColumnValues({
      dataset,
      column,
      values: [
        [1, 'Test Value 1'],
        [2, 'Test Value 2'],
        [3, 'Test Value 3'],
      ],
    });

    await connectAndClose(async (db) => {
      const tableName = getDatasetTableName(dataset);
      const columnName = getColumnName(column).replace(/"/g, '');

      const result = await db.run(`SELECT * FROM ${tableName}`);
      const rows = await result.getRowObjects();

      expect(rows.length).toEqual(3);

      expect(rows).toEqual([
        {
          [columnName]: 'Test Value 1',
          rowIdx: 1n,
        },
        {
          [columnName]: 'Test Value 2',
          rowIdx: 2n,
        },
        {
          [columnName]: 'Test Value 3',
          rowIdx: 3n,
        },
      ]);
    });
  });

  it('should update existing values', async () => {
    const column = {
      id: 'test-column',
      name: 'Test Column',
      type: 'VARCHAR',
    };

    await createDatasetTable({
      dataset,
      columns: [column],
    });

    await upsertColumnValues({
      dataset,
      column,
      values: [
        [1, 'Test Value 1'],
        [2, 'Test Value 2'],
        [3, 'Test Value 3'],
      ],
    });

    await upsertColumnValues({
      dataset,
      column,
      values: [
        [1, 'Test Value 4'],
        [2, 'Test Value 5'],
        [3, 'Test Value 6'],
      ],
    });

    await connectAndClose(async (db) => {
      const tableName = getDatasetTableName(dataset);
      const columnName = getColumnName(column).replace(/"/g, '');

      const result = await db.run(`SELECT * FROM ${tableName}`);
      const rows = await result.getRowObjects();

      expect(rows.length).toEqual(3);

      expect(rows).toEqual([
        {
          [columnName]: 'Test Value 4',
          rowIdx: 1n,
        },
        {
          [columnName]: 'Test Value 5',
          rowIdx: 2n,
        },
        {
          [columnName]: 'Test Value 6',
          rowIdx: 3n,
        },
      ]);
    });
  });

  it('should insert numbers', async () => {
    const column = {
      id: 'test-column',
      name: 'Test Column',
      type: 'INTEGER',
    };

    await createDatasetTable({
      dataset,
      columns: [column],
    });

    await upsertColumnValues({
      dataset,
      column,
      values: [
        [1, 1],
        [2, 2],
        [3, 3],
      ],
    });

    await connectAndClose(async (db) => {
      const tableName = getDatasetTableName(dataset);
      const columnName = getColumnName(column).replace(/"/g, '');

      const result = await db.run(`SELECT * FROM ${tableName}`);
      const rows = await result.getRowObjects();

      expect(rows.length).toEqual(3);

      expect(rows).toEqual([
        {
          [columnName]: 1,
          rowIdx: 1n,
        },
        {
          [columnName]: 2,
          rowIdx: 2n,
        },
        {
          [columnName]: 3,
          rowIdx: 3n,
        },
      ]);
    });
  });

  it('should escape single quotes in values', async () => {
    const column = {
      id: 'test-column',
      name: 'Test Column',
      type: 'VARCHAR',
    };

    await createDatasetTable({
      dataset,
      columns: [column],
    });

    await upsertColumnValues({
      dataset,
      column,
      values: [[1, "Test Value '1'"]],
    });

    await connectAndClose(async (db) => {
      const tableName = getDatasetTableName(dataset);
      const columnName = getColumnName(column).replace(/"/g, '');

      const result = await db.run(`SELECT * FROM ${tableName}`);
      const rows = await result.getRowObjects();

      expect(rows.length).toEqual(1);

      expect(rows).toEqual([
        {
          [columnName]: "Test Value '1'",
          rowIdx: 1n,
        },
      ]);
    });
  });

  it("should insert 'null' and 'undefined' values", async () => {
    const column = {
      id: 'test-column',
      name: 'Test Column',
      type: 'VARCHAR',
    };

    await createDatasetTable({
      dataset,
      columns: [column],
    });

    await upsertColumnValues({
      dataset,
      column,
      values: [
        [1, 'Test Value 1'],
        [2, null],
        [3, undefined],
      ],
    });

    await connectAndClose(async (db) => {
      const tableName = getDatasetTableName(dataset);
      const columnName = getColumnName(column).replace(/"/g, '');

      const result = await db.run(`SELECT * FROM ${tableName}`);
      const rows = await result.getRowObjects();

      expect(rows.length).toEqual(3);

      expect(rows).toEqual([
        {
          [columnName]: 'Test Value 1',
          rowIdx: 1n,
        },
        {
          [columnName]: null,
          rowIdx: 2n,
        },
        {
          [columnName]: null,
          rowIdx: 3n,
        },
      ]);
    });
  });

  it('should escape dollar characters', async () => {
    const column = {
      id: 'test-column',
      name: 'Test Column',
      type: 'VARCHAR',
    };

    await createDatasetTable({
      dataset,
      columns: [column],
    });

    await upsertColumnValues({
      dataset,
      column,
      values: [[1, '$\\boxed{mgh}$']],
    });

    await connectAndClose(async (db) => {
      const tableName = getDatasetTableName(dataset);
      const columnName = getColumnName(column).replace(/"/g, '');

      const result = await db.run(`SELECT * FROM ${tableName}`);
      const rows = await result.getRowObjects();

      expect(rows.length).toEqual(1);

      expect(rows).toEqual([
        {
          [columnName]: '$\\boxed{mgh}$',
          rowIdx: 1n,
        },
      ]);
    });
  });
});
