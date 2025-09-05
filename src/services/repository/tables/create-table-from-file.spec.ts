import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { connectAndClose } from '~/services/db/duckdb';
import { ColumnModel, DatasetModel } from '~/services/db/models';
import { createDatasetTableFromFile } from './create-table-from-file';
import { deleteDatasetTable } from './delete-table';
import { getDatasetTableName } from './utils';

let dataset: DatasetModel | undefined;

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

describe('create-table-from-file', () => {
  it('should create a table from a jsonl file', async () => {
    const importedColumns = await createDatasetTableFromFile({
      dataset: dataset!,
      file: 'tests/test.jsonl',
    });

    await ColumnModel.findAll({
      where: {
        datasetId: dataset!.id,
      },
      order: [['createdAt', 'ASC']],
    });

    await connectAndClose(async (db) => {
      const tableName = getDatasetTableName(dataset!);
      const result = await db.run(`
          SELECT * FROM ${tableName}
      `);

      const rows = await result.getRowObjects();

      expect(rows).toEqual([
        {
          rowIdx: 0n,

          [importedColumns[0].id]: 1n,
          [importedColumns[1].id]: 'John Doe',
          [importedColumns[2].id]: 25n,
        },
        {
          rowIdx: 1n,
          [importedColumns[0].id]: 2n,
          [importedColumns[1].id]: 'Jane Smith',
          [importedColumns[2].id]: 34n,
        },
        {
          rowIdx: 2n,
          [importedColumns[0].id]: 3n,
          [importedColumns[1].id]: 'Bob Johnson',
          [importedColumns[2].id]: 45n,
        },
        {
          rowIdx: 3n,
          [importedColumns[0].id]: 4n,
          [importedColumns[1].id]: 'Alice Williams',
          [importedColumns[2].id]: 23n,
        },
        {
          rowIdx: 4n,
          [importedColumns[0].id]: 5n,
          [importedColumns[1].id]: 'Michael Brown',
          [importedColumns[2].id]: 37n,
        },
      ]);
    });
  });

  it('should create a dataset table from a csv file', async () => {
    const importedColumns = await createDatasetTableFromFile({
      dataset: dataset!,
      file: 'tests/test.csv',
    });

    await connectAndClose(async (db) => {
      const tableName = getDatasetTableName(dataset!);
      const result = await db.run(`
          SELECT * FROM ${tableName}
      `);

      const rows = await result.getRowObjects();

      expect(rows).toEqual([
        {
          [importedColumns[0].id]: 1n,
          [importedColumns[1].id]: ' John Doe',
          [importedColumns[2].id]: 30n,
          rowIdx: 0n,
        },
        {
          [importedColumns[0].id]: 2n,
          [importedColumns[1].id]: ' Jane Smith',
          [importedColumns[2].id]: 25n,
          rowIdx: 1n,
        },
        {
          [importedColumns[0].id]: 3n,
          [importedColumns[1].id]: ' Emily Jones',
          [importedColumns[2].id]: 22n,
          rowIdx: 2n,
        },
      ]);
    });
  });

  it('should create a table from a google sheet', async () => {
    const ds = await DatasetModel.create({
      name: 'test-dataset',
      createdBy: 'test',
    });

    const createdColumns = await createDatasetTableFromFile({
      dataset: ds,
      file: 'https://docs.google.com/spreadsheets/d/1RN-4tNyOL66FDnrRtnH7-Uwq2ZepEnj2a32RoKU5tkA/edit?gid=0#gid=0',
    });

    expect(createdColumns).toBeDefined();
    expect(createdColumns.length).toBe(2);
  });

  it('should raise an error if the file does not exist', async () => {
    await expect(
      createDatasetTableFromFile({
        dataset: dataset!,
        file: 'tests/non-existent-file.jsonl',
      }),
    ).rejects.toThrow(
      'IO Error: No files found that match the pattern "tests/non-existent-file.jsonl"',
    );
  });
});
