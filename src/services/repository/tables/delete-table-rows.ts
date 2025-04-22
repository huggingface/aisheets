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
}): Promise<number> => {
  const tableName = getDatasetTableName(dataset);
  let deletedRows = 0;

  await connectAndClose(async (db) => {
    const result = await db.run(`
      DELETE FROM ${tableName}
      WHERE rowIdx IN (${rowIdxs.join(', ')})
      RETURNING rowIdx;
    `);

    deletedRows = result.rowCount;

    for (const rowIdx of rowIdxs.sort((a, b) => b - a)) {
      await db.run(`
        UPDATE ${tableName}
        SET rowIdx = rowIdx - 1
        WHERE rowIdx > ${rowIdx}
      `);
    }
  });

  return deletedRows;
};
