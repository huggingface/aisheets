import { connectAndClose } from '~/services/db/duckdb';
import { getDatasetTableName } from './utils';

export const getTableSize = async ({
  dataset,
}: {
  dataset: {
    id: string;
    name: string;
  };
}): Promise<number> => {
  return connectAndClose(async (db) => {
    const tableName = getDatasetTableName(dataset);

    const result = await db.run(`
        SELECT COUNT(*) as count 
        FROM ${tableName}
    `);

    const rows = await result.getRows();
    if (rows.length === 0) return 0;

    const count = rows[0][0] as number;

    return Number(count);
  });
};
