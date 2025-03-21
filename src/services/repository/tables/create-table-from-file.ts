import { connectAndClose } from '~/services/db/duckdb';
import { ColumnModel } from '~/services/db/models';
import type { Column, ColumnKind } from '~/state';
import {
  getColumnName,
  getDatasetRowSequenceName,
  getDatasetTableName,
} from './utils';

export const createDatasetTableFromFile = async (
  {
    dataset,
    file,
  }: {
    dataset: {
      id: string;
      name: string;
      createdBy: string;
    };
    file: string;
  },
  options?: {
    limit?: number;
  },
): Promise<Column[]> => {
  return await connectAndClose(async (db) => {
    const tableName = getDatasetTableName(dataset);
    const sequenceName = getDatasetRowSequenceName(dataset);

    const results = await db.run(`
      DESCRIBE (SELECT * FROM '${file}');
    `);

    const columns = await results.getRowObjects();

    const dbColumns = await ColumnModel.bulkCreate(
      columns.map((column) => ({
        datasetId: dataset.id,
        name: column.column_name as string,
        type: column.column_type as string,
        kind: 'static',
      })),
    );

    const selectColumnNames = dbColumns
      .map((column) => `"${column.name}" as ${getColumnName(column)}`)
      .join(', ');

    let selectStatement = `SELECT ${selectColumnNames}, nextval('${sequenceName}') as rowIdx FROM '${file}'`;

    if (options?.limit) selectStatement += ` LIMIT ${options.limit}`;

    await db.run(`
      CREATE OR REPLACE SEQUENCE ${sequenceName} START 0 INCREMENT 1 MINVALUE 0;

      CREATE TABLE ${tableName} AS (${selectStatement});

      ALTER TABLE ${tableName} ADD PRIMARY KEY (rowIdx);
      
      SHOW ${tableName};
    `);

    return dbColumns.map((column) => {
      return {
        id: column.id,
        name: column.name,
        type: column.type,
        kind: column.kind as ColumnKind,
        visible: column.visible,
        dataset,
        cells: [],
      };
    });
  });
};
