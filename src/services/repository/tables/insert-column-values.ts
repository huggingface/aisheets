import { connectAndClose } from '~/services/db/duckdb';
import { escapeValue, getColumnName, getDatasetTableName } from './utils';

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
      const result = await db.run(`
        SELECT * FROM ${tableName} WHERE rowIdx = ${idx} LIMIT 1;
      `);

      if (result.rowCount > 0) {
        // Update existing row
        await db.run(`
          UPDATE ${tableName} SET ${columnName} = ${escapeValue(value)} WHERE rowIdx = ${idx};
        `);
      } else {
        // Insert new row
        await db.run(`
        INSERT INTO ${tableName} (rowIdx, ${columnName})
        VALUES (${idx}, ${escapeValue(value)});
      `);
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
