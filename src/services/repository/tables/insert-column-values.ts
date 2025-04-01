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

    const insert_values = [];
    for await (const [idx, value] of generator) {
      insert_values.push(`(${idx}, ${escapeValue(value)})`);
    }

    return await db.run(`
      INSERT OR REPLACE INTO ${tableName} (rowIdx, ${columnName}) 
      VALUES ${insert_values.join(',')}
    `);
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
