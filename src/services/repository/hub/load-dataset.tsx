import { DuckDBInstance, type DuckDBType } from '@duckdb/node-api';

export interface LoadDatasetResult {
  columns: { name: string; type: DuckDBType }[];
  rows: object[];
}

export const loadDataset = async ({
  repoid,
  accessToken,
  parquetFiles,
}: {
  repoid: string;
  accessToken: string;
  parquetFiles: string[];
}): Promise<LoadDatasetResult> => {
  const uris = parquetFiles
    .map((file) => `'hf://datasets/${repoid}@~parquet/${file}'`)
    .join(',');

  const instance = await DuckDBInstance.create(':memory:');
  const db = await instance.connect();
  try {
    await db.run(
      [
        `CREATE SECRET hf_token (TYPE HUGGINGFACE, TOKEN ${accessToken})`,
        `CREATE VIEW tbl AS (SELECT * FROM read_parquet([${uris}]))`,
      ].join(';'),
    );

    const result = await db.run('SELECT * FROM tbl LIMIT 1000');

    const columns = result.columnTypes().map((type, index) => ({
      name: result.columnName(index),
      type,
    }));

    const rows = await result.getRowsJson();

    return {
      columns,
      rows,
    };
  } finally {
    await db.close();
  }
};
