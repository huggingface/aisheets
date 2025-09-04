import { connectAndClose } from '~/services/db/duckdb';
import { getColumnName, getDatasetTableName, sanitizeValue } from './utils';

export const upsertColumnValuesFromGenerator = async ({
  dataset,
  column,
  valuesGenerator,
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
  valuesGenerator: () => AsyncGenerator<[number, any]>;
}): Promise<any> => {
  return await connectAndClose(async (db) => {
    const tableName = getDatasetTableName(dataset);
    const columnName = getColumnName(column);
    const generator = valuesGenerator();

    for await (const [idx, value] of generator) {
      const result = await db.run(
        `
        SELECT * FROM ${tableName} WHERE rowIdx = $1 LIMIT 1;
      `,
        { 1: idx },
      );

      if (result.rowCount > 0) {
        // Update existing row
        await db.run(
          `
          UPDATE ${tableName} SET ${columnName} = $1 WHERE rowIdx = $2;
        `,
          { 1: sanitizeValue(value), 2: idx },
        );
      } else {
        // Insert new row
        await db.run(
          `
        INSERT INTO ${tableName} (rowIdx, ${columnName})
        VALUES ($1, $2);
      `,
          { 1: idx, 2: sanitizeValue(value) },
        );
      }
    }
  });
};

export const upsertColumnValues = async ({
  dataset,
  column,
  values,
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
  values: [number, any][];
}): Promise<any> => {
  return await upsertColumnValuesFromGenerator({
    dataset,
    column,
    valuesGenerator: async function* () {
      for (const value of values) {
        yield value;
      }
    },
  });
};
