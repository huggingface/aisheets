import { DuckDBInstance } from '@duckdb/node-api';

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
  const instance = await DuckDBInstance.create(':memory:');
  const db = await instance.connect();
  try {
    await db.run(
      [
        `CREATE SECRET hf_token (TYPE HUGGINGFACE, TOKEN ${accessToken})`,
        `CREATE VIEW tbl AS (SELECT * FROM read_parquet(${`'hf://datasets/${repoId}@~parquet/${subset}/${split}/0000.parquet'`}))`,
      ].join(';'),
    );

    const result = await db.run('DESCRIBE tbl');
    const rows = await result.getRowObjectsJson();

    const columns: ColumnInfo[] = rows.map((column) => {
      return {
        name: column.column_name as string,
        type: column.column_type as string,
      };
    });

    return columns;
  } finally {
    await db.close();
  }
};
