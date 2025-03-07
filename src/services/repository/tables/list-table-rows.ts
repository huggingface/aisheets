import { connectAndClose } from '~/services/db/duckdb';
import { getColumnName, getDatasetTableName } from './utils';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const listDatasetTableRows = async ({
  dataset,
  columns,
  limit,
  offset,
}: {
  dataset: {
    id: string;
    name: string;
  };
  columns: {
    id: string;
  }[];
  limit?: number;
  offset?: number;
}): Promise<Record<string, any>[]> => {
  const tableName = getDatasetTableName(dataset);

  return await connectAndClose(async (db) => {
    const selectedColumns = columns.map(getColumnName).join(', ');

    let statement = `
        SELECT ${selectedColumns} FROM (
            SELECT ${selectedColumns}
            FROM ${tableName} 
            ORDER BY rowIdx ASC
        )`;

    if (limit) statement += ` LIMIT ${limit}`;
    if (offset) statement += ` OFFSET ${offset}`;

    const results = await db.run(statement);

    const rows = await results.getRowObjectsJson();

    return rows;
  });
};

export const exportDatasetTableRows = async ({
  dataset,
  columns,
}: {
  dataset: {
    id: string;
    name: string;
  };
  columns: {
    id: string;
    name: string;
  }[];
}): Promise<string> => {
  const tableName = getDatasetTableName(dataset);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-'));
  const parquetPath = path.join(tempDir, 'file.parquet');

  return await connectAndClose(async (db) => {
    const sourceColumns = columns.map(getColumnName).join(', ');

    const selectedColumns = columns
      .map((column) => `${getColumnName(column)} as "${column.name}"`)
      .join(', ');

    const results = await db.run(`
        COPY (
          SELECT ${selectedColumns} 
          FROM ${tableName}
        ) TO '${parquetPath}' (FORMAT PARQUET)
    `);

    return parquetPath;
  });
};
