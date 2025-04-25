import { $, type NoSerialize, useComputed$ } from '@builder.io/qwik';

import { type Dataset, useDatasetsStore } from '~/state/datasets';

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
  isExecuting?: boolean;
  cancellable?: NoSerialize<AbortController>;
}

export interface CreateColumn {
  name: string;
  type: string;
  kind: ColumnKind;
  dataset: Omit<Dataset, 'columns'>;
  process?: {
    modelName: string;
    modelProvider: string;
    prompt: string;
    columnsReferences: string[];
    offset: number;
    limit: number;
    isExecuting?: boolean;
    cancellable?: NoSerialize<AbortController>;
  };
}

export type Cell = {
  id?: string;
  idx: number;
  updatedAt: Date;
  generating: boolean;
  validated: boolean;
  value?: any;
  error?: string;
  column?: {
    id: string;
  };
};

export interface Column {
  id: string;
  name: string;
  type: string;
  kind: ColumnKind;
  visible: boolean;
  process?: Process | undefined;
  cells: Cell[];
  dataset: Omit<Dataset, 'columns'>;
  numberOfCells?: number;
}

export const isDirty = (column: Column): boolean => {
  if (!column.process) return false;

  const { activeDataset } = useDatasetsStore();
  const columnsReferences = column.process!.columnsReferences.map((id) =>
    activeDataset.value.columns.find((c: Column) => c.id === id),
  );

  if (!columnsReferences.length && column.cells.every((c) => !c.validated)) {
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
        {
          id: TEMPORAL_ID,
          idx: 5,
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
          idx: 6,
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
          idx: 7,
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

  const firstColumn = useComputed$(() => columns.value[0]);

  return {
    columns,
    firstColumn,
    maxNumberOfRows: $((column: Column, columnsReferences: string[]) => {
      const dataset = activeDataset.value;

      if (dataset.columns.length === 0 || column.id === firstColumn.value.id) {
        return 1000;
      }

      if (columnsReferences && columnsReferences.length > 0) {
        const cellsCount = dataset.columns
          .filter((c) => columnsReferences.includes(c.id))
          .map((c) => c.numberOfCells ?? 0);

        if (cellsCount.length > 0) return Math.min(...cellsCount);
      }

      return firstColumn.value.numberOfCells ?? 0;
    }),
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

      if (column.cells.some((c) => c.idx === cell.idx)) {
        column.cells = [
          ...column.cells.map((c) => (c.idx === cell.idx ? cell : c)),
        ];
      } else {
        column.cells.push(cell);
      }

      replaceColumn(columns.value);
    }),
    deleteCellByIdx: $((...idxs: number[]) => {
      for (const column of columns.value) {
        for (const idx of idxs) {
          column.cells = column.cells.filter((c) => c.idx !== idx);
        }

        for (const idx of idxs.sort((a, b) => b - a)) {
          column.cells = column.cells.map((c) =>
            c.idx > idx ? { ...c, idx: c.idx - 1 } : c,
          );
        }
      }

      replaceColumn(columns.value);
    }),
  };
};
