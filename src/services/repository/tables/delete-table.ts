import { connectAndClose } from '~/services/db/duckdb';
import { getDatasetRowSequenceName, getDatasetTableName } from './utils';

export const deleteDatasetTable = async (dataset: {
  id: string;
  name: string;
  createdBy: string;
}): Promise<void> => {
  await connectAndClose(async (db) => {
    await db.run(`
      DROP TABLE IF EXISTS ${getDatasetTableName(dataset)};
      DROP SEQUENCE IF EXISTS ${getDatasetRowSequenceName(dataset)} CASCADE;
    `);
  });
};
