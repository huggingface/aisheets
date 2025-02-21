import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';

const duckDB = await DuckDBInstance.create(':memory:', {
  threads: '10',
});

export const dbConnect = async () => {
  return await duckDB.connect();
};

type GenericIdentityFn<T> = (db: DuckDBConnection) => Promise<T>;

export const connectAndClose = async <T>(
  func: GenericIdentityFn<T>,
): Promise<T> => {
  const db = await dbConnect();
  try {
    return await func(db);
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    db.close();
  }
};
