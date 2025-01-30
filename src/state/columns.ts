import { $, useContext, useSignal, useTask$ } from '@builder.io/qwik';

import { type Dataset, datasetsContext } from '~/state/datasets';

export type ColumnType = 'text' | 'array' | 'number' | 'boolean' | 'object';
export type ColumnKind = 'static' | 'dynamic';

export interface Process {
  modelName: string;
  prompt: string;
  columnsReferences: string[];
  offset: number;
  limit: number;
}

export interface CreateColumn {
  name: string;
  type: ColumnType;
  kind: ColumnKind;
  executionProcess?: Process;
  dataset: Dataset;
}

export type Cell = {
  id: string;
  idx: number;
  columnId: string;
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

export const useColumnsStore = () => {
  const dataset = useContext(datasetsContext);
  const columns = useSignal(dataset.value.columns);

  useTask$(({ track }) => {
    track(columns);

    dataset.value.columns = [...columns.value];
  });

  useTask$(({ track }) => {
    track(dataset);

    columns.value = [...dataset.value.columns];
  });

  return {
    state: columns,
    replaceColumn: $((replaced: Column[]) => {
      columns.value = [...replaced];
    }),
    addColumn: $((newbie: Column) => {
      columns.value = [...columns.value, newbie];
    }),
    updateColumn: $((updated: Column) => {
      columns.value = [
        ...columns.value.map((c) => (c.name === updated.name ? updated : c)),
      ];
    }),
    deleteColumn: $((deleted: Column) => {
      columns.value = columns.value.filter((c) => c.name !== deleted.name);
    }),
    addCell: $((cell: Cell) => {
      const column = columns.value.find((c) => c.id === cell.columnId);

      if (column) {
        column.cells.push(cell);
      }

      columns.value = [...columns.value];
    }),
    replaceCell: $((cell: Cell) => {
      const column = columns.value.find((c) => c.id === cell.columnId);

      if (!column) return;

      column.cells = [
        ...column.cells.map((c) => (c.id === cell.id ? cell : c)),
      ];

      columns.value = [...columns.value];
    }),
  };
};
