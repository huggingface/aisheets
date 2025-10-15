import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import { appConfig } from '~/config';

const {
  data: { duckDb },
} = appConfig;

const duckDB = await DuckDBInstance.create(duckDb);

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
    db.closeSync();
  }
};

await connectAndClose(async (db) => {
  // Install plugins and extensions

  await db.run(`
    INSTALL gsheets FROM community;
    INSTALL nanoarrow FROM community;

    LOAD gsheets;
    LOAD nanoarrow;
    
    SET threads=2;
    SET temp_directory = '${duckDB}_duckdb_swap';
    SET memory_limit='128GB';
    SET max_temp_directory_size = '256GB';

  `);
});
