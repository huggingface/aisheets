import { connectAndClose } from '~/services/db/duckdb';
import { getColumnName, getDatasetTableName } from './utils';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  DuckDBBlobValue,
  DuckDBListValue,
  DuckDBStructValue,
} from '@duckdb/node-api';

export const countDatasetTableRows = async ({
  dataset,
}: {
  dataset: {
    id: string;
    name: string;
  };
}): Promise<number> => {
  const tableName = getDatasetTableName(dataset);

  return await connectAndClose(async (db) => {
    const results = await db.run(
      `SELECT CAST(COUNT(*) AS INTEGER) FROM ${tableName}`,
    );
    return (await results.getRows())[0][0] as number;
  });
};

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

    const rows = await results.getRowObjects();

    const cleanValues = (row: any) => {
      for (const key in row) {
        let value = row[key];

        if (value instanceof DuckDBStructValue) {
          value = value.entries;
          cleanValues(value);
          row[key] = value;
        }

        if (value instanceof DuckDBBlobValue) {
          row[key] = row[key].bytes;
        }

        if (value instanceof DuckDBListValue) {
          row[key] = row[key].values ?? [];
          for (let i = 0; i < row[key].length; i++) {
            cleanValues(row[key][i]);
          }
        }

        if (typeof value === 'bigint') {
          row[key] = Number(value);
        }
      }

      return row;
    };

    return rows.map(cleanValues);
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
