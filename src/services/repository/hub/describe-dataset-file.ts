import { connectAndClose } from '~/services/db/duckdb';

export interface FileInfo {
  columns: ColumnInfo[];
  numberOfRows: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
}

export const describeFromURI = async ({
  uri,
}: {
  uri: string;
}): Promise<FileInfo> => {
  return await connectAndClose(async (db) => {
    // This is not working when running in a hf space
    // await db.run(
    //   // TODO: Keep secrets scoped to the current user
    //   `CREATE OR REPLACE SECRET hf_token (TYPE HUGGINGFACE, TOKEN '${accessToken}')`,
    // );
    const totalRows = (
      await (
        await db.run(`SELECT COUNT(1) as total FROM '${uri}'`)
      ).getRowObjectsJson()
    ).reduce((acc, row) => {
      return acc + Number(row.total);
    }, 0);

    const result = await db.run(`DESCRIBE (SELECT * FROM '${uri}' LIMIT 10)`);
    const columns: ColumnInfo[] = (await result.getRowObjectsJson()).map(
      (column) => {
        return {
          name: column.column_name as string,
          type: column.column_type as string,
        };
      },
    );

    return {
      columns,
      numberOfRows: totalRows,
    };
  });
};

export const describeDatasetFile = async ({
  repoId,
  file,
  accessToken,
}: {
  repoId: string;
  file: string;
  accessToken: string;
}): Promise<ColumnInfo[]> => {
  const result = await describeFromURI({
    uri: `hf://datasets/${repoId}/${file}`,
  });

  return result.columns;
};
