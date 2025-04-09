import { connectAndClose } from '~/services/db/duckdb';
import { getDatasetTableName } from './utils';

export const deleteDatasetTableRows = async ({
  dataset,
  rowIdxs,
}: {
  dataset: {
    id: string;
  };
  rowIdxs: number[];
}): Promise<void> => {
  const tableName = getDatasetTableName(dataset);

  await connectAndClose(async (db) => {
    await db.run(`
      DELETE FROM ${tableName}
      WHERE rowIdx IN (${rowIdxs.join(', ')})
    `);

    for (const rowIdx of rowIdxs) {
      await db.run(`
        UPDATE ${tableName}
        SET rowIdx = rowIdx - 1
        WHERE rowIdx = ${rowIdx}
      `);
    }
  });
};
