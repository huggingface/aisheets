import { connectAndClose } from '~/services/db/duckdb';
import { getColumnName, getDatasetTableName } from './utils';

const TYPES_MAP: Record<string, string> = {
  image: 'BLOB',
};

export const createDatasetTableColumn = async ({
  dataset,
  column,
}: {
  dataset: {
    id: string;
    name: string;
    createdBy: string;
  };
  column: {
    id: string;
    name: string;
    type: string;
  };
}): Promise<void> => {
  await connectAndClose(async (db) => {
    const tableName = getDatasetTableName(dataset);
    const columnName = getColumnName(column);

    // Map the column type to DuckDB types
    const type = TYPES_MAP[column.type] || 'TEXT';

    await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${type}`);
  });
};
