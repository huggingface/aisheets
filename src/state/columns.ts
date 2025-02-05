import { $, useComputed$, useContext } from '@builder.io/qwik';

import { type Dataset, datasetsContext } from '~/state/datasets';

export type ColumnType = 'text' | 'array' | 'number' | 'boolean' | 'object';
export type ColumnKind = 'static' | 'dynamic';

export interface Process {
  id?: string;
  modelName: string;
  prompt: string;
  columnsReferences?: string[];
  offset: number;
  limit: number;
}

export interface CreateColumn {
  name: string;
  type: ColumnType;
  kind: ColumnKind;
  dataset: Dataset;
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
  dataset?: Omit<Dataset, 'columns'>;
}

export const TEMPORAL_ID = '-1';
export const useColumnsStore = () => {
  const dataset = useContext(datasetsContext);
  const columns = useComputed$(() => {
    if (dataset.value.columns.length === 0) {
      return [
        {
          id: TEMPORAL_ID,
          name: 'Column 1',
          kind: 'dynamic',
          type: 'text',
          cells: [],
          dataset: {
            ...dataset.value,
          },
        },
      ] as Column[];
    }

    return dataset.value.columns.filter((c) => c.id !== TEMPORAL_ID);
  });

  const replaceColumn = $((replaced: Column[]) => {
    dataset.value = {
      ...dataset.value,
      columns: [...replaced],
    };
  });

  return {
    state: columns,
    addColumn: $((newbie: Column) => {
      replaceColumn([...columns.value, newbie]);
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
