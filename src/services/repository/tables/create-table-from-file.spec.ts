import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';
import { connectAndClose } from '~/services/db/duckdb';
import { createDatasetTableFromFile } from './create-table-from-file';
import { deleteDatasetTable } from './delete-table';
import { getDatasetTableName } from './utils';

const dataset = {
  id: randomUUID(),
  name: 'Test Dataset',
  createdBy: 'test-user',
};

afterEach(async () => {
  await deleteDatasetTable(dataset);
});

describe('create-table-from-file', () => {
  it('should create a table from a jsonl file', async () => {
    const importedColumns = await createDatasetTableFromFile({
      dataset,
      file: 'tests/test.jsonl',
    });

    expect(importedColumns).toEqual([
      {
        id: 'id',
        name: 'id',
        type: 'BIGINT',
      },
      {
        id: 'name',
        name: 'name',
        type: 'VARCHAR',
      },
      {
        id: 'age',
        name: 'age',
        type: 'BIGINT',
      },
      {
        id: 'rowIdx',
        name: 'rowIdx',
        type: 'BIGINT',
      },
    ]);

    await connectAndClose(async (db) => {
      const tableName = getDatasetTableName(dataset);
      const result = await db.run(`
          SELECT * FROM ${tableName}
      `);

      const rows = await result.getRowObjects();

      expect(rows).toEqual([
        {
          rowIdx: 0n,
          age: 25n,
          id: 1n,
          name: 'John Doe',
        },
        {
          rowIdx: 1n,
          age: 34n,
          id: 2n,
          name: 'Jane Smith',
        },
        {
          rowIdx: 2n,
          age: 45n,
          id: 3n,
          name: 'Bob Johnson',
        },
        {
          rowIdx: 3n,
          age: 23n,
          id: 4n,
          name: 'Alice Williams',
        },
        {
          rowIdx: 4n,
          age: 37n,
          id: 5n,
          name: 'Michael Brown',
        },
      ]);
    });
  });

  it('should create a dataset table from a csv file', async () => {
    const importedColumns = await createDatasetTableFromFile({
      dataset,
      file: 'tests/test.csv',
    });

    expect(importedColumns).toEqual([
      {
        id: 'id',
        name: 'id',
        type: 'BIGINT',
      },
      {
        id: 'name',
        name: 'name',
        type: 'VARCHAR',
      },
      {
        id: 'age',
        name: 'age',
        type: 'BIGINT',
      },
      {
        id: 'rowIdx',
        name: 'rowIdx',
        type: 'BIGINT',
      },
    ]);

    await connectAndClose(async (db) => {
      const tableName = getDatasetTableName(dataset);
      const result = await db.run(`
          SELECT * FROM ${tableName}
      `);

      const rows = await result.getRowObjects();

      expect(rows).toEqual([
        {
          rowIdx: 0n,
          age: 30n,
          id: 1n,
          name: ' John Doe',
        },
        {
          rowIdx: 1n,
          age: 25n,
          id: 2n,
          name: ' Jane Smith',
        },
        {
          rowIdx: 2n,
          age: 22n,
          id: 3n,
          name: ' Emily Jones',
        },
      ]);
    });
  });

  it('should raise an error if the file does not exist', async () => {
    await expect(
      createDatasetTableFromFile({
        dataset,
        file: 'tests/non-existent-file.jsonl',
      }),
    ).rejects.toThrow(
      'IO Error: No files found that match the pattern "tests/non-existent-file.jsonl"',
    );
  });
});
