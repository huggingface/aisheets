import { connectAndClose } from '~/services/db/duckdb';

export interface DatasetRows {
  rows: Array<Record<string, any>>;
}

/**
 * Loads a dataset from the specified URI with optional column selection, limit, and offset.
 *
 * @param {Object} params - The parameters for loading the dataset.
 * @param {string} params.uri - The URI of the dataset to load.
 * @param {string[]} [params.columnNames] - An optional array of column names to select. If not provided, all columns will be selected.
 * @param {number} [params.limit] - An optional limit on the number of rows to retrieve.
 * @param {number} [params.offset] - An optional offset to start retrieving rows from.
 * @returns {Promise<DatasetRows>} A promise that resolves to an object containing the dataset rows.
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
  return await connectAndClose(async (db) => {
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
  });
};
