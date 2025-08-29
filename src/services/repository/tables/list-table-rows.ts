import { connectAndClose } from '~/services/db/duckdb';
import { getColumnName, getDatasetTableName } from './utils';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const countDatasetTableRows = async ({
  dataset,
  column,
}: {
  dataset: {
    id: string;
    name: string;
  };
  column?: {
    id: string;
  };
}): Promise<number> => {
  const tableName = getDatasetTableName(dataset);

  let whereClause = '';

  if (column) {
    const columnName = getColumnName(column);
    whereClause = `WHERE ${columnName} IS NOT NULL`;
  }

  return await connectAndClose(async (db) => {
    const results = await db.run(`
      SELECT CAST(COUNT(*) AS INTEGER)
      FROM ${tableName}
      ${whereClause}
    `);
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
            SELECT ${selectedColumns}, rowIdx
            FROM ${tableName} 
            ORDER BY rowIdx ASC
        )`;

    if (limit && offset) {
      statement += ` WHERE rowIdx >= ${offset} AND rowIdx < ${limit + offset}`;
    } else if (limit && !offset) {
      statement += ` WHERE rowIdx < ${limit}`;
    } else if (offset && !limit) {
      statement += ` WHERE rowIdx >= ${offset}`;
    }

    const results = await db.run(statement);
    const rows = await results.getRowObjectsJS();

    return rows;
  });
};

const FORMATS = {
  parquet: 'PARQUET',
  csv: 'CSV',
};

export const exportDatasetTableRows = async ({
  dataset,
  columns,
  format,
}: {
  dataset: {
    id: string;
    name: string;
  };
  columns: {
    id: string;
    name: string;
    type: string;
  }[];
  format?: 'parquet' | 'csv';
}): Promise<string> => {
  const tableName = getDatasetTableName(dataset);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-'));
  const duckdbFormat = FORMATS[format ?? 'parquet'] || 'PARQUET';
  const filePath = path.join(tempDir, `file.${duckdbFormat.toLowerCase()}`);

  return await connectAndClose(async (db) => {
    const coalesceStatement = `COALESCE(${columns.map((column) => `CAST (${getColumnName(column)} AS varchar(10))`).join(',')}) IS NOT NULL`;

    const selectedColumns = columns
      .map((column) => `${getColumnName(column)} as "${column.name}"`)
      .join(', ');

    let formatArgs = '';
    if (duckdbFormat === 'PARQUET') {
      const featuresInfo = generateFeaturesInfo(columns);
      // Render featuresInfo as a single quote map with unquoted keys

      formatArgs = `, KV_METADATA {
        huggingface: '${JSON.stringify(featuresInfo)}',
        generated_by: 'Sheets'
      }`;
    }

    await db.run(`
        COPY (
          SELECT ${selectedColumns} 
          FROM ${tableName}
          WHERE ${coalesceStatement}
          ORDER BY rowIdx ASC
        ) TO '${filePath}' (
          FORMAT ${duckdbFormat}
          ${formatArgs}
        )
    `);

    return filePath;
  });
};

const featuresInfoDict = (
  columns: { id: string; name: string; type: string }[],
) => {
  columns.reduce(
    (acc, column) => {
      switch (column.type.toLowerCase()) {
        case 'image': {
          acc[column.name] = {
            _type: 'Image',
          };
          break;
        }
        default: {
          // TODO: Handle other types like 'text', 'audio', etc.
          // For now, we treat everything else as a string
          acc[column.name] = {
            dtype: 'string',
            _type: 'Value',
          };
          break;
        }
      }

      return acc;
    },
    {} as Record<string, { dtype?: string; _type?: string }>,
  );
};

const generateFeaturesInfo = (
  columns: { id: string; name: string; type: string }[],
) => {
  return {
    info: {
      features: featuresInfoDict(columns),
    },
  };
};
