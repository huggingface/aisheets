import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';
import { connectAndClose } from '~/services/db/duckdb';
import { createDatasetTable } from './create-table';
import { deleteDatasetTable } from './delete-table';
import { getDatasetTableName } from './utils';

const dataset = {
  id: randomUUID(),
  name: 'test-dataset',
  createdBy: 'test-user',
};

afterEach(async () => {
  await deleteDatasetTable(dataset);
});

describe('createDatasetTable', () => {
  it('creates a new dataset table', async () => {
    await createDatasetTable({ dataset });

    await connectAndClose(async (db) => {
      const result = await db.run(`DESCRIBE ${getDatasetTableName(dataset)}`);
      expect(await result.getRowObjects()).toEqual([
        {
          column_name: 'rowIdx',
          column_type: 'BIGINT',
          default: `nextval('\"${dataset.id}_rowIdx_seq\"')`,
          extra: null,
          key: 'PRI',
          null: 'NO',
        },
      ]);
    });
  });

  it('should create a dataset table with the provided columns', async () => {
    await createDatasetTable({
      dataset,
      columns: [
        { id: '1', name: 'col1', type: 'TEXT' },
        { id: '2', name: 'col2', type: 'INTEGER' },
      ],
    });

    await connectAndClose(async (db) => {
      const result = await db.run(`DESCRIBE ${getDatasetTableName(dataset)}`);
      expect(await result.getRowObjects()).toEqual([
        {
          column_name: 'rowIdx',
          column_type: 'BIGINT',
          default: `nextval('\"${dataset.id}_rowIdx_seq\"')`,
          extra: null,
          key: 'PRI',
          null: 'NO',
        },
        {
          column_name: '1',
          column_type: 'VARCHAR',
          default: null,
          extra: null,
          key: null,
          null: 'YES',
        },
        {
          column_name: '2',
          column_type: 'INTEGER',
          default: null,
          extra: null,
          key: null,
          null: 'YES',
        },
      ]);
    });
  });
});
