import {
  $,
  type Signal,
  createContextId,
  useContext,
  useContextProvider,
} from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';

import { getAllColumns } from '~/services';

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
}

export type Cell = {
  id: string;
  idx: number;
  validated: boolean;
  value?: string;
  error?: string;
};

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  kind: ColumnKind;
  process?: Process;
  cells: Cell[];
}

const columnContext = createContextId<Signal<Column[]>>('column.context');
export const useLoadColumns = () => {
  const columns = useColumnsLoader();

  useContextProvider(columnContext, columns);

  return columns;
};

export const useColumnsLoader = routeLoader$<Column[]>(() => getAllColumns());

export const useColumnsStore = () => {
  const columns = useContext(columnContext);

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
  };
};
