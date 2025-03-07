import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ColumnModel, DatasetModel } from '~/services/db/models';
import { createDatasetTableFromFile } from './create-table-from-file';
import { deleteDatasetTable } from './delete-table';
import { listDatasetTableRows } from './list-table-rows';

let dataset: DatasetModel | undefined = undefined;

beforeEach(async () => {
  dataset = await DatasetModel.create({
    name: 'test-dataset',
    createdBy: 'test',
  });
});

afterEach(async () => {
  await DatasetModel.destroy({ where: {} });
  await ColumnModel.destroy({ where: {} });

  await deleteDatasetTable(dataset!);
});

describe(
  'listDatasetTableRows',
  () => {
    it('should return the rows of a dataset', async () => {
      const columns = await createDatasetTableFromFile({
        dataset: dataset!,
        file: 'tests/test.csv',
      });

      const rows = await listDatasetTableRows({
        dataset: dataset!,
        columns,
      });

      expect(rows).toHaveLength(3);

      expect(rows).toEqual([
        {
          [columns[0].id]: 1n,
          [columns[1].id]: ' John Doe',
          [columns[2].id]: 30n,
        },
        {
          [columns[0].id]: 2n,
          [columns[1].id]: ' Jane Smith',
          [columns[2].id]: 25n,
        },
        {
          [columns[0].id]: 3n,
          [columns[1].id]: ' Emily Jones',
          [columns[2].id]: 22n,
        },
      ]);
    });

    it('should return the rows of a dataset with a limit', async () => {
      const columns = await createDatasetTableFromFile({
        dataset: dataset!,
        file: 'tests/test.csv',
      });

      const rows = await listDatasetTableRows({
        dataset: dataset!,
        columns,
        limit: 1,
      });

      expect(rows).toHaveLength(1);

      expect(rows).toEqual([
        {
          [columns[0].id]: 1n,
          [columns[1].id]: ' John Doe',
          [columns[2].id]: 30n,
        },
      ]);
    });

    it('should return the rows of a dataset with an offset', async () => {
      const columns = await createDatasetTableFromFile({
        dataset: dataset!,
        file: 'tests/test.csv',
      });

      const rows = await listDatasetTableRows({
        dataset: dataset!,
        columns,
        offset: 1,
      });

      expect(rows).toHaveLength(2);

      expect(rows).toEqual([
        {
          [columns[0].id]: 2n,
          [columns[1].id]: ' Jane Smith',
          [columns[2].id]: 25n,
        },
        {
          [columns[0].id]: 3n,
          [columns[2].id]: 22n,
          [columns[1].id]: ' Emily Jones',
        },
      ]);
    });
  },

  { timeout: 500000 },
);
