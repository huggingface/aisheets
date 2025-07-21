import {
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { CellError } from '~/features/table/components/body/cell-error';
import { CellRenderer } from '~/features/table/components/body/cell-renderer';
import { CellSkeleton } from '~/features/table/components/body/cell-skeleton';
import { getColumnCellById } from '~/services';
import { type Cell, type Column, useColumnsStore } from '~/state';

const loadCell = server$(async (cellId: string) => {
  const persistedCell = await getColumnCellById(cellId);
  if (!persistedCell) return;

  return {
    error: persistedCell.error,
    value: persistedCell.value,
    validated: persistedCell.validated,
  };
});

export const TableCell = component$<{
  cell: Cell;
}>(({ cell }) => {
  const { replaceCell, columns } = useColumnsStore();
  const cellColumn = useSignal<Column | undefined>();

  useTask$(({ track }) => {
    track(() => columns.value);

    cellColumn.value = columns.value.find((col) => col.id === cell.column?.id);
  });

  useVisibleTask$(async () => {
    if (cell.generating) return;
    if (cell.error || cell.value) return;
    if (!cell.id) return;

    const persistedCell = await loadCell(cell.id);
    if (!persistedCell) return;

    replaceCell({
      ...cell,
      ...persistedCell,
    });
  });

  return (
    <div class="min-h-[100px] h-[102px] max-h-[102px] relative flex flex-col overflow-hidden group">
      <CellSkeleton cell={cell} />
      <CellError cell={cell} />

      <div class="flex-1 px-2 pt-2">
        <CellRenderer cell={cell} column={cellColumn.value!} />
      </div>
    </div>
  );
});
