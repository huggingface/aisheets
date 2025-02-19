import { DuckDBInstance } from '@duckdb/node-api';
import type { Dataset } from '~/state';

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
 * @param {string} params.name - The name of the loaded table. Must be unique.
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
export const loadDataset = async ({
  dataset,
  repoId,
  accessToken,
  parquetFiles,
  columnNames,
  limit,
  offset,
}: {
  dataset: Dataset;
  repoId: string;
  accessToken: string;
  parquetFiles: string[];
  columnNames?: string[];
  limit?: number;
  offset?: number;
}): Promise<DatasetRows> => {
  const db = await instance.connect();
  const tableName = `tbl_${dataset.id.replaceAll('-', '_')}`;

  try {
    const uris = parquetFiles
      .map((file) => `'hf://datasets/${repoId}@~parquet/${file}'`)
      .join(',');

    // This is not working when running in a hf space
    // await db.run(
    //   // TODO: Keep secrets scoped to the current user
    //   `CREATE OR REPLACE SECRET hf_token (TYPE HUGGINGFACE, TOKEN '${accessToken}')`,
    // );

    await db.run(
      `CREATE TABLE IF NOT EXISTS ${tableName} AS SELECT *, CAST(file_row_number AS INTEGER) as rowIdx FROM read_parquet([${uris}], file_row_number=true)`,
    );

    const columnsSelect = columnNames
      ? columnNames
          .concat(['rowIdx'])
          .map((column) => `"${column}"`)
          .join(', ')
      : '*';

    let selectClause = `SELECT ${columnsSelect} FROM ${tableName}`;

    if (limit) {
      selectClause += ` LIMIT ${limit}`;
    }

    if (offset) {
      selectClause += ` OFFSET ${offset}`;
    }

    const result = await db.run(selectClause);
    const rows = await result.getRowObjectsJson();

    return {
      rows,
    };
  } catch (error) {
    throw new Error(`Failed to load dataset: ${error}`);
  } finally {
    db.close();
  }
};
