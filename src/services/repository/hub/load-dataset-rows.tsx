import { DuckDBInstance } from '@duckdb/node-api';

export interface DatasetRows {
  rows: Array<Record<string, any>>;
}

/**
 * Loads dataset rows from specified parquet files in a Hugging Face repository.
 *
 * @param {Object} params - The parameters for loading dataset rows.
 * @param {string} params.repoId - The repository ID of the Hugging Face dataset.
 * @param {string} params.accessToken - The access token for authenticating with Hugging Face.
 * @param {string[]} params.parquetFiles - An array of parquet file names to load data from.
 * @param {number} [params.limit=500] - The maximum number of rows to load (default is 500).
 * @param {number} [params.offset=0] - The number of rows to skip before starting to load (default is 0).
 * @returns {Promise<DatasetRows>} A promise that resolves to an object containing the loaded dataset rows.
 *
 * @example
 * const datasetRows = await loadDatasetRows({
 *   repoId: 'my-repo-id',
 *   accessToken: 'my-access-token',
 *   parquetFiles: ['file1.parquet', 'file2.parquet'],
 *   limit: 100,
 *   offset: 0,
 * });
 * console.log(datasetRows.rows);
 */
export const loadDatasetRows = async ({
  repoId,
  accessToken,
  parquetFiles,
  columnNames,
  limit,
  offset,
}: {
  repoId: string;
  accessToken: string;
  parquetFiles: string[];
  columnNames?: string[];
  limit?: number;
  offset?: number;
}): Promise<DatasetRows> => {
  const uris = parquetFiles
    .map((file) => `'hf://datasets/${repoId}@~parquet/${file}'`)
    .join(',');

  const columnsSelect = columnNames ? columnNames.join(', ') : '*';

  const instance = await DuckDBInstance.create(':memory:');
  const db = await instance.connect();
  try {
    await db.run(
      `CREATE SECRET hf_token (TYPE HUGGINGFACE, TOKEN ${accessToken})`,
    );

    const _limit = limit || 500;
    const _offset = offset || 0;

    const result = await db.run(
      `SELECT ${columnsSelect}, file_row_number FROM read_parquet([${uris}], file_row_number=true) LIMIT ${_limit} OFFSET ${_offset}`,
    );

    const rows = await result.getRowObjectsJson();

    return {
      rows: rows.map((row) => {
        return {
          ...row,
          idx: Number.parseInt(String(row.file_row_number)),
        };
      }),
    };
  } finally {
    db.close();
  }
};
