import { appConfig } from '~/config';
import { connectAndClose } from '~/services/db/duckdb';
import { getColumnName, getDatasetTableName, getRowIndexName } from './utils';

const colums2tableDefinition = (
  columns: { id: string; name: string; type: string }[],
) =>
  columns.map((column) => `${getColumnName(column)} ${column.type}`).join(', ');

export const createDatasetTable = async ({
  dataset,
  columns,
}: {
  dataset: {
    id: string;
    name: string;
    createdBy: string;
  };
  columns?: {
    id: string;
    name: string;
    type: string;
  }[];
}): Promise<void> => {
  if (!columns) {
    columns = [];
  }

  const tableName = getDatasetTableName(dataset);
  const rowIndexName = getRowIndexName(dataset);

  const numberOfRows = appConfig.data.maxRowsImport;

  const insertValues = Array.from({ length: numberOfRows }, (_, i) => {
    return `(${i})`;
  }).join(', ');

  await connectAndClose(async (db) => {
    await db.run(`
      CREATE TABLE ${tableName} (
        rowIdx BIGINT,
        ${colums2tableDefinition(columns)}
      );

      CREATE INDEX ${rowIndexName} ON ${tableName} (rowIdx);

      INSERT INTO ${tableName} (rowIdx)
      VALUES ${insertValues};
    `);
  });
};
