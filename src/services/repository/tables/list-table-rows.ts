import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { connectAndClose } from '~/services/db/duckdb';
import { bigIntStringify } from '~/usecases/utils/serializer';
import { getColumnName, getDatasetTableName } from './utils';

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

const readImageBuffer = (data: any): Uint8Array | undefined => {
  const imageData = data;
  if (!imageData) {
    return undefined;
  }
  if (imageData instanceof Uint8Array) {
    return imageData;
  } else if (imageData instanceof ArrayBuffer) {
    return new Uint8Array(imageData);
  } else if (
    imageData &&
    typeof imageData === 'object' &&
    'buffer' in imageData
  ) {
    return new Uint8Array(imageData.buffer);
  } else {
    throw new Error(`Invalid image data format`);
  }
};

const exportDatasetTableRowsAsZip = async ({
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
    type: string;
  }[];
}): Promise<string> => {
  const tableName = getDatasetTableName(dataset);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-'));
  const filePath = path.join(tempDir, `file.csv`);

  // For each image column, generate a folder with images
  const imageColumns = columns.filter(
    (col) => col.type.toLowerCase() === 'image',
  );
  if (imageColumns.length > 0) {
    await connectAndClose(async (db) => {
      for (const column of imageColumns) {
        const folderPath = path.join(tempDir, column.name);
        await fs.mkdir(folderPath, { recursive: true });

        // Get all rowIdx and image data for this column
        const results = await db.run(`
          SELECT rowIdx, ${getColumnName(column)} as imageData
          FROM ${tableName}
          WHERE ${getColumnName(column)} IS NOT NULL
        `);
        const rows = await results.getRowObjectsJS();

        for (const row of rows) {
          const imageBuffer = readImageBuffer(row.imageData);
          if (!imageBuffer) continue;
          const imageFilePath = path.join(folderPath, `${row.rowIdx}.jpg`);
          await fs.writeFile(imageFilePath, imageBuffer);
        }
      }
    });
  }

  await connectAndClose(async (db) => {
    const coalesceStatement = `COALESCE(${columns.map((column) => `CAST (${getColumnName(column)} AS varchar(10))`).join(',')}) IS NOT NULL`;

    const selectedColumns = columns
      .map((column) => {
        if (column.type.toLowerCase() === 'image') {
          // Generate path: folder is column.name, filename is rowIdx.jpg
          return `CASE WHEN ${getColumnName(column)} IS NOT NULL THEN CONCAT('${column.name}/', CAST(rowIdx AS VARCHAR), '.jpg') ELSE NULL END as "${column.name}"`;
        }
        return `${getColumnName(column)} as "${column.name}"`;
      })
      .join(', ');

    await db.run(`
        COPY (
          SELECT ${selectedColumns} 
          FROM ${tableName}
          WHERE ${coalesceStatement}
          ORDER BY rowIdx ASC
        ) TO '${filePath}' (
          FORMAT csv
        )
    `);
  });

  // Create a zip file containing the CSV and image folders
  const zipFilePath = path.join(tempDir, `file.zip`);
  const zip = new JSZip();
  const csvData = await fs.readFile(filePath);
  zip.file('data.csv', new Uint8Array(csvData));

  for (const column of imageColumns) {
    const folder = zip.folder(column.name);
    const folderPath = path.join(tempDir, column.name);
    const files = await fs.readdir(folderPath);
    for (const fileName of files) {
      const fileData = await fs.readFile(path.join(folderPath, fileName));
      folder?.file(fileName, new Uint8Array(fileData));
    }
  }

  const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.writeFile(zipFilePath, new Uint8Array(zipContent));

  return zipFilePath;
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
  format?: 'parquet' | 'csv' | 'zip';
}): Promise<string> => {
  if (format === 'zip') {
    return await exportDatasetTableRowsAsZip({ dataset, columns });
  }

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
        huggingface: '${JSON.stringify(featuresInfo, bigIntStringify)}',
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
