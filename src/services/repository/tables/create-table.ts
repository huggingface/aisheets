import { connectAndClose } from '~/services/db/duckdb';
import {
  getColumnName,
  getDatasetRowSequenceName,
  getDatasetTableName,
} from './utils';

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
  const sequenceName = getDatasetRowSequenceName(dataset);

  await connectAndClose(async (db) => {
    await db.run(`
      CREATE SEQUENCE ${sequenceName} START 0 INCREMENT 1 MINVALUE 0;
    
      CREATE TABLE ${tableName} (
        rowIdx BIGINT DEFAULT nextval('${sequenceName}'),
        ${colums2tableDefinition(columns)}
      )`);
  });
};
