import { afterEach, describe, expect, it } from 'vitest';

import { createDatasetTableFromFile } from './create-table-from-file';
import { deleteDatasetTable } from './delete-table';
import { listDatasetTableRows } from './list-table-rows';

const dataset = {
  id: '1',
  name: 'dataset',
  createdBy: 'user',
};

const columns = [
  {
    id: '1',
    name: 'column1',
    type: 'INTEGER',
  },
  {
    id: '2',
    name: 'column2',
    type: 'TEXT',
  },
];

afterEach(async () => {
  await deleteDatasetTable(dataset);
});

describe(
  'listDatasetTableRows',
  () => {
    it('should return the rows of a dataset', async () => {
      const columns = await createDatasetTableFromFile({
        dataset,
        file: 'tests/test.csv',
      });

      const rows = await listDatasetTableRows({
        dataset,
        columns,
      });

      expect(rows).toHaveLength(3);

      expect(rows).toEqual([
        {
          age: 30n,
          id: 1n,
          name: ' John Doe',
          rowIdx: 0n,
        },
        {
          age: 25n,
          id: 2n,
          name: ' Jane Smith',
          rowIdx: 1n,
        },
        {
          age: 22n,
          id: 3n,
          name: ' Emily Jones',
          rowIdx: 2n,
        },
      ]);
    });

    it('should return the rows of a dataset with a limit', async () => {
      const columns = await createDatasetTableFromFile({
        dataset,
        file: 'tests/test.csv',
      });

      const rows = await listDatasetTableRows({
        dataset,
        columns,
        limit: 1,
      });

      expect(rows).toHaveLength(1);

      expect(rows).toEqual([
        {
          age: 30n,
          id: 1n,
          name: ' John Doe',
          rowIdx: 0n,
        },
      ]);
    });

    it('should return the rows of a dataset with an offset', async () => {
      const columns = await createDatasetTableFromFile({
        dataset,
        file: 'tests/test.csv',
      });

      const rows = await listDatasetTableRows({
        dataset,
        columns,
        offset: 1,
      });

      expect(rows).toHaveLength(2);

      expect(rows).toEqual([
        {
          age: 25n,
          id: 2n,
          name: ' Jane Smith',
          rowIdx: 1n,
        },
        {
          age: 22n,
          id: 3n,
          name: ' Emily Jones',
          rowIdx: 2n,
        },
      ]);
    });
  },

  { timeout: 500000 },
);
