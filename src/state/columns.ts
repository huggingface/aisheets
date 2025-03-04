import { $, useComputed$ } from '@builder.io/qwik';

import { type Dataset, useDatasetsStore } from '~/state/datasets';

export type ColumnType = 'text' | 'array' | 'number' | 'boolean' | 'object';
export type ColumnKind = 'static' | 'dynamic';

export interface Process {
  id?: string;
  modelName: string;
  modelProvider: string;
  prompt: string;
  columnsReferences: string[];
  offset: number;
  limit: number;
  updatedAt: Date;
}

export interface CreateColumn {
  name: string;
  type: ColumnType;
  kind: ColumnKind;
  dataset: Omit<Dataset, 'columns'>;
  process: {
    modelName: string;
    modelProvider: string;
    prompt: string;
    columnsReferences: string[];
    offset: number;
    limit: number;
  };
}

export type Cell = {
  id: string;
  idx: number;
  updatedAt: Date;
  generating: boolean;
  validated: boolean;
  value?: string;
  error?: string;
  column?: {
    id: string;
  };
};

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  kind: ColumnKind;
  visible: boolean;
  process: Process | null;
  cells: Cell[];
  dataset: Omit<Dataset, 'columns'>;
}

export const isDirty = (column: Column) => {
  if (!column.process) return false;

  if (column.cells.every((c) => c.validated)) return false;

  if (column.cells.some((c) => c.validated)) {
    const isAnyCellUpdatedAfterProcess = column.cells
      .filter((c) => c.validated)
      .some((c) => c.updatedAt > column.process!.updatedAt);

    return isAnyCellUpdatedAfterProcess;
  }

  return false;
};

export const canGenerate = (columnId: string, columns: Column[]) => {
  const refreshedColumn = columns.find((c) => c.id === columnId)!;
  if (!refreshedColumn) return false;
  if (!refreshedColumn.process) return false;

  const columnsReferences = refreshedColumn.process!.columnsReferences.map(
    (id) => columns.find((c) => c.id === id),
  );

  if (
    !columnsReferences.length &&
    refreshedColumn.cells.every((c) => !c.validated)
  ) {
    return true;
  }

  return columnsReferences.every((c) => c && !isDirty(c));
};

export const TEMPORAL_ID = '-1';
export const useColumnsStore = () => {
  const { activeDataset } = useDatasetsStore();

  const createPlaceholderColumn = $((): Column => {
    const getNextColumnName = (counter = 1): string => {
      const manyColumnsWithName = activeDataset.value.columns.filter(
        (c) => c.id !== TEMPORAL_ID,
      );
      const newPosibleColumnName = `Column ${manyColumnsWithName.length + 1}`;

      if (!manyColumnsWithName.find((c) => c.name === newPosibleColumnName)) {
        return newPosibleColumnName;
      }

      return getNextColumnName(counter + 1);
    };

    return {
      id: TEMPORAL_ID,
      name: getNextColumnName(),
      kind: 'dynamic',
      type: 'text',
      visible: true,
      cells: [
        {
          id: TEMPORAL_ID,
          idx: 0,
          validated: false,
          updatedAt: new Date(),
          generating: false,
          value: '',
          column: {
            id: TEMPORAL_ID,
          },
        },
        {
          id: TEMPORAL_ID,
          idx: 1,
          validated: false,
          updatedAt: new Date(),
          generating: false,
          value: '',
          column: {
            id: TEMPORAL_ID,
          },
        },
        {
          id: TEMPORAL_ID,
          idx: 2,
          validated: false,
          updatedAt: new Date(),
          generating: false,
          value: '',
          column: {
            id: TEMPORAL_ID,
          },
        },
        {
          id: TEMPORAL_ID,
          idx: 3,
          validated: false,
          updatedAt: new Date(),
          generating: false,
          value: '',
          column: {
            id: TEMPORAL_ID,
          },
        },
        {
          id: TEMPORAL_ID,
          idx: 4,
          validated: false,
          updatedAt: new Date(),
          generating: false,
          value: '',
          column: {
            id: TEMPORAL_ID,
          },
        },
      ],
      process: {
        modelName: '',
        modelProvider: '',
        offset: 0,
        limit: 5,
        prompt: '',
        columnsReferences: [],
        updatedAt: new Date(),
      },
      dataset: {
        ...activeDataset.value,
      },
    };
  });

  const columns = useComputed$(async () => {
    if (activeDataset.value.columns.length === 0) {
      activeDataset.value.columns = [await createPlaceholderColumn()];
    }

    return activeDataset.value.columns;
  });

  const replaceColumn = $((replaced: Column[]) => {
    activeDataset.value = {
      ...activeDataset.value,
      columns: [...replaced],
    };
  });

  const firstColum = useComputed$(() => columns.value[0]);
  const firstDynamicColumn = useComputed$(() =>
    columns.value.find((c) => c.kind === 'dynamic'),
  );

  return {
    columns,
    firstColum,
    maxNumberOfRows: $((column: Column) => {
      if (
        firstDynamicColumn.value &&
        column.kind === 'dynamic' &&
        column.id !== firstDynamicColumn.value?.id
      ) {
        return firstDynamicColumn.value.process!.limit;
      }

      return 1000;
    }),
    canGenerate: $((column: Column) => canGenerate(column.id, columns.value)),
    isDirty: $((column: Column) => isDirty(column)),
    addTemporalColumn: $(async () => {
      if (activeDataset.value.columns.some((c) => c.id === TEMPORAL_ID)) return;

      const newTemporalColumn = await createPlaceholderColumn();

      replaceColumn([...columns.value, newTemporalColumn]);
    }),
    removeTemporalColumn: $(() => {
      replaceColumn(columns.value.filter((c) => c.id !== TEMPORAL_ID));
    }),
    addColumn: $((newbie: Column) => {
      replaceColumn([
        ...columns.value.filter((c) => c.id !== TEMPORAL_ID),
        newbie,
      ]);
    }),
    updateColumn: $((updated: Column) => {
      replaceColumn(
        columns.value.map((c) =>
          c.id === updated.id
            ? {
                ...updated,
                cells: c.cells,
              }
            : c,
        ),
      );
    }),
    deleteColumn: $((deleted: Column) => {
      replaceColumn(columns.value.filter((c) => c.id !== deleted.id));
    }),
    replaceCell: $((cell: Cell) => {
      const column = columns.value.find((c) => c.id === cell.column?.id);
      if (!column) return;

      if (column.cells.some((c) => c.id === cell.id)) {
        column.cells = [
          ...column.cells.map((c) => (c.id === cell.id ? cell : c)),
        ];
      } else {
        column.cells.push(cell);
      }

      replaceColumn(columns.value);
    }),
  };
};
