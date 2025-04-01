import { connectAndClose } from '~/services/db/duckdb';
import { getColumnName, getDatasetTableName } from './utils';

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

    await db.run(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${column.type}`,
    );
  });
};
