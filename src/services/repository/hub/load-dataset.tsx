import { DuckDBInstance } from '@duckdb/node-api';

const instance = await DuckDBInstance.create(':memory:', {
  threads: '10',
});

export interface DatasetRows {
  rows: Array<Record<string, any>>;
}

/**
 * Loads dataset from specified parquet files in a Hugging Face repository.
 *
 * @param {Object} params - The parameters for loading dataset rows.
 * @param {string} params.uri - The URI of the dataset to load.
 * @param {string} params.repoId - The repository ID of the Hugging Face dataset.
 * @param {string} params.accessToken - The access token for authenticating with Hugging Face.
 * @param {string[]} params.parquetFiles - An array of parquet file names to load data from.
 * @param {number} [params.limit=500] - The maximum number of rows to load (default is 500).
 * @param {number} [params.offset=0] - The number of rows to skip before starting to load (default is 0).
 * @returns {Promise<DatasetRows>} A promise that resolves to an object containing the loaded dataset rows.
 *
 * @example
 * const datasetRows = await loadDataset({
 *   repoId: 'my-repo-id',
 *   accessToken: 'my-access-token',
 *   parquetFiles: ['file1.parquet', 'file2.parquet'],
 *   limit: 100,
 *   offset: 0,
 * });
 * console.log(datasetRows.rows);
 */
export const loadDatasetFromURI = async ({
  uri,
  columnNames,
  limit,
  offset,
}: {
  uri: string;
  columnNames?: string[];
  limit?: number;
  offset?: number;
}): Promise<DatasetRows> => {
  const db = await instance.connect();

  try {
    const columnsSelect = columnNames
      ? columnNames.map((column) => `"${column}"`).join(', ')
      : '*';

    let selectClause = `SELECT ${columnsSelect} FROM '${uri}'`;

    if (limit) {
      selectClause += ` LIMIT ${limit}`;
    }

    if (offset) {
      selectClause += ` OFFSET ${offset}`;
    }

    const result = await db.run(selectClause);
    const rows = await result.getRowObjects();

    return {
      rows: rows.map((row, idx) => {
        return {
          ...row,
          rowIdx: (offset || 0) + idx,
        };
      }),
    };
  } catch (error) {
    throw new Error(`Failed to load dataset: ${error}`);
  } finally {
    db.close();
  }
};
