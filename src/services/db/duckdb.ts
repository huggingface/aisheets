import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import { appConfig } from '~/config';

const {
  data: { duckDb },
} = appConfig;

const duckDB = await DuckDBInstance.create(duckDb, {
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
    const result = await func(db);
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    db.disconnectSync();
  }
};

await connectAndClose(async (db) => {
  // Install plugins and extensions

  await db.run(`
    INSTALL gsheets FROM community;
    INSTALL nanoarrow FROM community;

    LOAD gsheets;
    LOAD nanoarrow;
  `);
});
