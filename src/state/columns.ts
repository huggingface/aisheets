import { $, type NoSerialize, useComputed$ } from '@builder.io/qwik';

import { useDatasetsStore } from '~/state/datasets';

export type ColumnKind = 'static' | 'dynamic';

export type TaskType =
  | 'text-generation'
  | 'image-text-to-text'
  | 'text-to-image';

export interface Process {
  // Persisted data
  id?: string;
  prompt: string;
  modelName: string;
  modelProvider?: string;
  endpointUrl?: string;
  columnsReferences?: string[];
  searchEnabled: boolean;
  imageColumnId?: string;
  task: TaskType;
  updatedAt?: Date;
  // Non persisted data
  processedCells?: number;
  isExecuting?: boolean;
  cancellable?: NoSerialize<AbortController>;
  offset?: number;
  limit?: number;
}

export interface CreateColumn {
  name: string;
  type: string;
  kind: ColumnKind;
  dataset: {
    id: string;
    name: string;
    createdBy: string;
  };
  process?: {
    modelName: string;
    modelProvider?: string;
    endpointUrl?: string;
    prompt: string;
    searchEnabled: boolean;
    columnsReferences?: string[];
    imageColumnId?: string; // For image processing workflows
    task: TaskType; // What the process does
    isExecuting?: boolean;
    cancellable?: NoSerialize<AbortController>;
  };
}

export type ColumnPrototypeWithId = ColumnPrototype & {
  columnId: Column['id'];
};
export type ColumnPrototypeWithNextColumnId = ColumnPrototype & {
  nextColumnId: Column['id'];
};

export interface ColumnPrototype {
  name?: string;
  type?: Column['type'];
  prompt?: string;
  modelName?: string;
  modelProvider?: string;
  endpointUrl?: string;
  task?: TaskType;
}
export interface CellSource {
  url: string;
  snippet: string;
}

export type Cell = {
  id?: string;
  idx: number;
  updatedAt: Date;
  generating: boolean;
  validated: boolean;
  value?: any;
  error?: string;
  sources?: CellSource[];
  column?: {
    id: Column['id'];
    type: Column['type'];
  };
};

export interface Column {
  id: string;
  name: string;
  type: 'text' | 'image' | 'image[]' | 'unknown';
  kind: ColumnKind;
  visible: boolean;
  process?: Process | undefined;
  cells: Cell[];
  dataset: {
    id: string;
    name: string;
    createdBy: string;
  };
  numberOfCells?: number;
}

export const TEMPORAL_ID = '-1';
export const useColumnsStore = () => {
  const { activeDataset } = useDatasetsStore();

  const createPlaceholderColumn = $((info?: ColumnPrototype): Column => {
    const getNextColumnName = (counter = 1): string => {
      const manyColumnsWithName = activeDataset.value.columns.filter(
        (c) => c.id !== TEMPORAL_ID,
      );

      const newPosibleColumnName = `column_${manyColumnsWithName.length + 1}`;

      if (!manyColumnsWithName.find((c) => c.name === newPosibleColumnName)) {
        return newPosibleColumnName;
      }

      return getNextColumnName(counter + 1);
    };

    const type = info?.type ?? 'text';

    return {
      id: TEMPORAL_ID,
      name: info?.name ?? getNextColumnName(),
      kind: 'dynamic',
      type,
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
            type,
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
            type,
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
            type,
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
            type,
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
            type,
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
            type,
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
            type,
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
            type,
          },
        },
      ],
      process: {
        modelName: info?.modelName ?? '',
        modelProvider: info?.modelProvider ?? '',
        prompt: info?.prompt ?? '',
        searchEnabled: false,
        endpointUrl: info?.endpointUrl ?? '',
        columnsReferences: [],
        task: info?.task ?? 'text-generation',
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

  const replaceColumns = $((replaced: Column[]) => {
    activeDataset.value = {
      ...activeDataset.value,
      columns: [...replaced],
    };
  });

  const firstColumn = useComputed$(() => columns.value[0]);

  return {
    columns,
    firstColumn,
    replaceColumns,
    addTemporalColumn: $(async (info: ColumnPrototypeWithNextColumnId) => {
      if (activeDataset.value.columns.some((c) => c.id === TEMPORAL_ID)) return;

      const newTemporalColumn = await createPlaceholderColumn(info);

      const nextColumnIndex = activeDataset.value.columns.findIndex(
        (c) => c.id === info.nextColumnId,
      );

      if (nextColumnIndex === -1) {
        throw new Error('nextColumnId not found');
      }

      replaceColumns([
        ...activeDataset.value.columns.slice(0, nextColumnIndex + 1),
        newTemporalColumn,
        ...activeDataset.value.columns.slice(nextColumnIndex + 1),
      ]);

      return newTemporalColumn;
    }),
    removeTemporalColumn: $(() => {
      replaceColumns(
        activeDataset.value.columns.filter((c) => c.id !== TEMPORAL_ID),
      );
    }),
    getColumn: $((id: string) => {
      return activeDataset.value.columns.find((c) => c.id === id);
    }),
    addColumn: $(async (newbie: Column) => {
      const temporalColumnIndex = activeDataset.value.columns.findIndex(
        (c) => c.id === TEMPORAL_ID,
      );

      if (temporalColumnIndex !== -1) {
        await replaceColumns([
          ...activeDataset.value.columns.slice(0, temporalColumnIndex),
          newbie,
          ...activeDataset.value.columns.slice(temporalColumnIndex + 1),
        ]);

        return;
      }

      await replaceColumns([
        ...activeDataset.value.columns.filter((c) => c.id !== TEMPORAL_ID),
        newbie,
      ]);
    }),
    removeColumn: $((removed: Column) => {
      replaceColumns(
        activeDataset.value.columns.filter((c) => c.id !== removed.id),
      );
    }),
    updateColumn: $((updated: Column) => {
      replaceColumns(
        activeDataset.value.columns.map((c) =>
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
      replaceColumns(
        activeDataset.value.columns.filter((c) => c.id !== deleted.id),
      );
    }),
    replaceCell: $((cell: Cell) => {
      const column = activeDataset.value.columns.find(
        (c) => c.id === cell.column?.id,
      );
      if (!column) return;

      if (column.cells.some((c) => c.idx === cell.idx)) {
        column.cells = [
          ...column.cells.map((c) => (c.idx === cell.idx ? cell : c)),
        ];
      } else {
        column.cells.push(cell);
        column.cells.sort((a, b) => a.idx - b.idx);
      }

      if (column.process) {
        column.process.processedCells =
          (column.process.processedCells ?? 0) + 1;
      }

      replaceColumns(activeDataset.value.columns);
    }),
    deleteCellByIdx: $((...idxs: number[]) => {
      for (const column of activeDataset.value.columns) {
        for (const idx of idxs) {
          column.cells = column.cells.filter((c) => c.idx !== idx);
        }

        for (const idx of idxs.sort((a, b) => b - a)) {
          column.cells = column.cells.map((c) =>
            c.idx > idx ? { ...c, idx: c.idx - 1 } : c,
          );
        }
      }

      replaceColumns(activeDataset.value.columns);
    }),
  };
};
