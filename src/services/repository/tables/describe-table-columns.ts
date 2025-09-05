import { DuckDBTypeId } from '@duckdb/node-api';
import { connectAndClose } from '~/services/db/duckdb';
import { getDatasetTableName } from './utils';

interface InnerDuckDBType {
  typeId: number;
  entryNames: string[];
  entryTypes: InnerDuckDBType[];
}

interface ListDuckDBType {
  typeId: number;
  valueType: InnerDuckDBType;
}

const duckDB2DBColumn = (col: { columnName: string; columnType: any }) => {
  const dbCol: DBColumn = {
    name: col.columnName,
    type: DuckDBTypeId[col.columnType.typeId],
  };

  let entryNames: string[] = col.columnType.entryNames || [];
  let entryTypes: InnerDuckDBType[] = col.columnType.entryTypes || [];

  if (col.columnType.valueType) {
    // Value type can be only a typeId (list of integers).
    dbCol.itemsType = DuckDBTypeId[col.columnType.valueType.typeId];

    entryNames = col.columnType.valueType.entryNames || [];
    entryTypes = col.columnType.valueType.entryTypes || [];
  }

  dbCol.properties = entryNames?.map((name, idx) => {
    return duckDB2DBColumn({
      columnName: name,
      columnType: entryTypes[idx],
    });
  });

  return dbCol;
};

export interface DBColumn {
  name: string;
  type: string;
  itemsType?: string;
  properties?: DBColumn[];
}

export const describeTableColumns = async (dataset: {
  id: string;
  name: string;
  createdBy: string;
}): Promise<DBColumn[]> => {
  return await connectAndClose(async (db) => {
    const results = await db.run(`
        SELECT * FROM ${getDatasetTableName(dataset)} LIMIT 0;
    `);

    const columns = results.columnNameAndTypeObjectsJson();

    if (!Array.isArray(columns)) return [];

    return columns.map((col) =>
      duckDB2DBColumn(
        col as {
          columnName: string;
          columnType: {
            typeId: number;
            entryNames: string[];
            entryTypes: {
              typeId: number;
              entryNames: string[];
              entryTypes: any[];
            }[];
          };
        },
      ),
    );
  });
};
