import { DuckDBInstance } from '@duckdb/node-api';

export interface DatasetRows {
  rows: Record<string, any>[];
}

/**
 * Loads dataset rows from specified parquet files in a Hugging Face repository.
 *
 * @param {Object} params - The parameters for loading dataset rows.
 * @param {string} params.repoid - The repository ID of the Hugging Face dataset.
 * @param {string} params.accessToken - The access token for authenticating with Hugging Face.
 * @param {string[]} params.parquetFiles - An array of parquet file names to load data from.
 * @param {number} [params.limit=500] - The maximum number of rows to load (default is 500).
 * @param {number} [params.offset=0] - The number of rows to skip before starting to load (default is 0).
 * @returns {Promise<DatasetRows>} A promise that resolves to an object containing the loaded dataset rows.
 *
 * @example
 * const datasetRows = await loadDatasetRows({
 *   repoid: 'my-repo-id',
 *   accessToken: 'my-access-token',
 *   parquetFiles: ['file1.parquet', 'file2.parquet'],
 *   limit: 100,
 *   offset: 0,
 * });
 * console.log(datasetRows.rows);
 */
export const loadDatasetRows = async ({
  repoid,
  accessToken,
  parquetFiles,
  limit,
  offset,
}: {
  repoid: string;
  accessToken: string;
  parquetFiles: string[];
  limit?: number;
  offset?: number;
}): Promise<DatasetRows> => {
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

    const _limit = limit || 500;
    const _offset = offset || 0;

    const result = await db.run(
      `SELECT * FROM tbl LIMIT ${_limit} OFFSET ${_offset}`,
    );

    const columns = result.columnTypes().map((type, index) => ({
      name: result.columnName(index),
      type,
    }));

    const rows = await result.getRowObjectsJson();

    return {
      rows: rows.map((row, idx) => {
        return {
          ...row,
          idx: idx + _offset,
        };
      }),
    };
  } finally {
    await db.close();
  }
};
