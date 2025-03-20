import { $ } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { useExecution } from '~/features/add-column';
import { getColumnById, getColumnCellById } from '~/services';
import {
  type Cell,
  type Column,
  type CreateColumn,
  TEMPORAL_ID,
  useColumnsStore,
} from '~/state';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';
import { useEditColumnUseCase } from '~/usecases/edit-column.usecase';
import { useRegenerateCellsUseCase } from '~/usecases/regenerate-cells.usecase';

const getColumnById$ = server$(getColumnById);
const getColumnCellById$ = server$(getColumnCellById);

export const useGenerateColumn = () => {
  const { open, columnId } = useExecution();
  const { addColumn, updateColumn, replaceCell, columns } = useColumnsStore();
  const addNewColumn = useAddColumnUseCase();
  const editColumn = useEditColumnUseCase();
  const regenerateCells = useRegenerateCellsUseCase();

  const syncAbortedColumn = $(async () => {
    const column = columns.value.find((c) => c.id === columnId.value);

    if (column) {
      const updated = await getColumnById$(column.id);
      updateColumn(updated!);

      for (const c of column.cells.filter((c) => c.generating)) {
        const cell = await getColumnCellById$(c.id);
        replaceCell(cell!);
      }
    }
  });

  const onCreateColumn = $(
    async (controller: AbortController, newColumn: CreateColumn) => {
      const response = await addNewColumn(controller.signal, newColumn);

      let createdColumn: Column | null = null;
      const pendingCells = new Map<number, Cell>();

      for await (const { column, cell } of response) {
        if (column) {
          createdColumn = column;
          addColumn(column);
          open(column.id, 'edit');
        }
        if (cell) {
          pendingCells.set(cell.idx, cell);
          const orderedCells = Array.from(pendingCells.entries())
            .sort(([idxA], [idxB]) => idxA - idxB)
            .map(([_, cell]) => cell);

          for (const orderedCell of orderedCells) {
            replaceCell(orderedCell);
          }
        }
      }

      if (createdColumn) {
        const updated = await getColumnById$(createdColumn.id);
        updateColumn(updated!);
      }
    },
  );

  const onRegenerateCells = $(async (column: Column) => {
    const response = await regenerateCells(column);
    const pendingCells = new Map<number, Cell>();

    for await (const cell of response) {
      pendingCells.set(cell.idx, cell);

      const orderedCells = Array.from(pendingCells.entries())
        .sort(([idxA], [idxB]) => idxA - idxB)
        .map(([_, cell]) => cell);

      for (const orderedCell of orderedCells) {
        replaceCell(orderedCell);
      }
    }

    const updated = await getColumnById$(column.id);
    updateColumn(updated!);
  });

  const onEditColumn = $(
    async (controller: AbortController, column: Column) => {
      const response = await editColumn(controller.signal, column);
      const pendingCells = new Map<number, Cell>();

      for await (const { column, cell } of response) {
        if (column) {
          updateColumn(column);
        }
        if (cell) {
          pendingCells.set(cell.idx, cell);

          const orderedCells = Array.from(pendingCells.entries())
            .sort(([idxA], [idxB]) => idxA - idxB)
            .map(([_, cell]) => cell);

          for (const orderedCell of orderedCells) {
            replaceCell(orderedCell);
          }
        }
      }

      const updated = await getColumnById$(column.id);
      updateColumn(updated!);
    },
  );

  const onGenerateColumn = $(
    async (controller: AbortController, column: Column | CreateColumn) => {
      controller.signal.onabort = () => {
        syncAbortedColumn();
      };

      if ('id' in column && column.id === TEMPORAL_ID) {
        return onCreateColumn(controller, column as CreateColumn);
      }
      return onEditColumn(controller, column as Column);
    },
  );

  return { onGenerateColumn, onRegenerateCells };
};
