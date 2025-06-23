import {
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { Skeleton } from '~/components';
import { CellActions } from '~/features/table/components/body/cell-actions';
import { CellContentRenderer } from '~/features/table/components/body/cell-renderer';
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
    <div class="min-h-[100px] h-[100px] max-h-[100px] group">
      <div class="relative h-full">
        <div class="relative flex flex-col h-full overflow-hidden">
          {cell.generating && (
            <div class="absolute inset-0 flex items-center justify-center">
              <Skeleton />
            </div>
          )}

          {cell.error ? (
            <span class="mt-2 p-4 text-red-500 text-xs flex items-center gap-1">
              <span>⚠</span>
              <span>{cell.error}</span>
            </span>
          ) : (
            <div class="h-full flex flex-col justify-between p-1">
              <CellActions cell={cell} />
              <CellContentRenderer cell={cell} column={cellColumn.value!} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
