import { DuckDBInstance } from '@duckdb/node-api';

const instance = await DuckDBInstance.create(':memory:');

export interface ColumnInfo {
  name: string;
  type: string;
}

export const describeDatasetSplit = async ({
  repoId,
  accessToken,
  subset,
  split,
}: {
  repoId: string;
  accessToken: string;
  subset: string;
  split: string;
}): Promise<ColumnInfo[]> => {
  const db = await instance.connect();

  try {
    // This is not working when running in a hf space
    // await db.run(
    //   // TODO: Keep secrets scoped to the current user
    //   `CREATE OR REPLACE SECRET hf_token (TYPE HUGGINGFACE, TOKEN '${accessToken}')`,
    // );

    const result = await db.run(
      `DESCRIBE (SELECT * FROM read_parquet(${`'hf://datasets/${repoId}@~parquet/${subset}/${split}/0000.parquet'`}) LIMIT 10)`,
    );

    const rows = await result.getRowObjectsJson();

    const columns: ColumnInfo[] = rows.map((column) => {
      return {
        name: column.column_name as string,
        type: column.column_type as string,
      };
    });

    return columns;
  } finally {
    db.close();
  }
};
