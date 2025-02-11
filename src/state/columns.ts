import { $, useComputed$ } from '@builder.io/qwik';

import { type Dataset, useDatasetsStore } from '~/state/datasets';

export type ColumnType = 'text' | 'array' | 'number' | 'boolean' | 'object';
export type ColumnKind = 'static' | 'dynamic';

export interface Process {
  id?: string;
  modelName: string;
  modelProvider: string;
  prompt: string;
  columnsReferences?: string[];
  offset: number;
  limit: number;
}

export interface CreateColumn {
  name: string;
  type: ColumnType;
  kind: ColumnKind;
  dataset: Omit<Dataset, 'columns'>;
  process?: Process;
}

export type Cell = {
  id: string;
  idx: number;
  column?: Column;
  validated: boolean;
  value?: string;
  error?: string;
  updatedAt: Date;
};

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  kind: ColumnKind;
  process?: Process;
  cells: Cell[];
  dataset: Omit<Dataset, 'columns'>;
}

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
      cells: [],
      process: {
        modelName: '',
        modelProvider: '',
        offset: 0,
        limit: 5,
        prompt: '',
        columnsReferences: [],
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

  return {
    state: columns,
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
        columns.value.map((c) => (c.id === updated.id ? updated : c)),
      );
    }),
    deleteColumn: $((deleted: Column) => {
      replaceColumn(columns.value.filter((c) => c.id !== deleted.id));
    }),
    addCell: $((cell: Cell) => {
      const column = columns.value.find((c) => c.id === cell.column?.id);
      if (!column) return;

      column.cells.push(cell);

      replaceColumn(columns.value);
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
