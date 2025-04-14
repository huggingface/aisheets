import {
  $,
  Fragment,
  component$,
  useComputed$,
  useOnWindow,
  useSignal,
  useStore,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuDot } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { nextTick } from '~/components/hooks/tick';
import { useExecution } from '~/features/add-column';
import { TableCell } from '~/features/table/table-cell';
import { getColumnCells } from '~/services';
import { type Cell, type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableBody = component$(() => {
  const { columns, firstColumn } = useColumnsStore();

  const tableBody = useSignal<HTMLElement>();
  const rowHeight = 100;
  const visibleRowCount = 10;
  const buffer = 2;

  const scrollTop = useSignal(0);
  const startIndex = useSignal(0);
  const endIndex = useSignal(0);

  const data = useSignal<Cell[][]>([]);
  const rowCount = useSignal(0);

  const debounceStore = useStore({
    timeout: 0 as number | null,
  });

  useOnWindow(
    'scroll',
    $((event) => {
      const target = event.target as HTMLElement;

      if (!target.classList.contains('scrollable')) return;

      if (debounceStore.timeout) {
        clearTimeout(debounceStore.timeout);
      }

      debounceStore.timeout = window.setTimeout(() => {
        scrollTop.value = target.scrollTop - tableBody.value!.offsetTop;
      }, 30);
    }),
  );

  useVisibleTask$(({ track }) => {
    track(scrollTop);
    track(data);

    startIndex.value = Math.max(
      Math.floor(scrollTop.value / rowHeight) - buffer,
      0,
    );

    endIndex.value = Math.min(
      startIndex.value + visibleRowCount + buffer * 2,
      rowCount.value,
    );
  });

  useTask$(({ track }) => {
    track(columns);

    rowCount.value = Math.max(firstColumn.value.cells.length, 8);

    const getCell = (column: Column, rowIndex: number): Cell => {
      const cell = column.cells[rowIndex];

      if (!cell) {
        // Temporal cell for skeleton
        return {
          id: undefined,
          value: '',
          error: '',
          validated: false,
          column: {
            id: column.id,
          },
          updatedAt: new Date(),
          generating: false,
          idx: rowIndex,
        };
      }

      return cell;
    };

    const visibleColumns = columns.value.filter((c) => c.visible);
    data.value = Array.from({ length: rowCount.value }, (_, rowIndex) =>
      Array.from({ length: visibleColumns.length }, (_, colIndex) =>
        getCell(visibleColumns[colIndex], rowIndex),
      ),
    );
  });

  const topSpacerHeight = useComputed$(() => startIndex.value * rowHeight);
  const bottomSpacerHeight = useComputed$(() =>
    Math.max(0, (rowCount.value - endIndex.value) * rowHeight),
  );

  const selectedCellsId = useSignal<Cell[]>([]);

  const latestCellSelected = useComputed$(() => {
    return selectedCellsId.value[selectedCellsId.value.length - 1];
  });
  const isDragging = useSignal(false);
  const dragStartCell = useSignal<Cell>();
  const handleMouseDown = $((cell: Cell) => {
    isDragging.value = true;
    dragStartCell.value = cell;

    selectedCellsId.value = [cell];
  });

  const handleMouseOver = $((cell: Cell) => {
    if (isDragging.value && dragStartCell.value) {
      if (dragStartCell.value.column?.id !== cell.column?.id) return;

      const startRowIndex = dragStartCell.value.idx;
      const endRowIndex = cell.idx;
      const start = Math.min(startRowIndex, endRowIndex);
      const end = Math.max(startRowIndex, endRowIndex);

      const selectedCells = [];

      for (let i = start; i <= end; i++) {
        selectedCells.push(
          data.value[i].find((c) => c.column?.id === cell.column?.id),
        );
      }
      selectedCellsId.value = selectedCells.filter((c) => c) as Cell[];
    }
  });

  const handleMouseUp = $(() => {
    if (dragStartCell.value) {
      console.log(
        'FROM',
        dragStartCell.value.idx,
        'TO',
        latestCellSelected.value?.idx,
      );
      isDragging.value = false;
      dragStartCell.value = undefined;
    }
  });

  return (
    <tbody ref={tableBody}>
      {/* Top spacer row to maintain scroll position */}
      {topSpacerHeight.value > 0 && (
        <tr style={{ height: `${topSpacerHeight.value}px` }}>
          <td class="p-0 border-none" colSpan={columns.value.length + 1} />
        </tr>
      )}

      {data.value.slice(startIndex.value, endIndex.value).map((rows, i) => {
        const actualRowIndex = startIndex.value + i;
        return (
          <tr
            key={actualRowIndex}
            class="hover:bg-gray-50/50 transition-colors"
          >
            <td class="px-2 text-center border-[0.5px] border-t-0 bg-neutral-100">
              {actualRowIndex + 1}
            </td>

            {rows.map((cell) => {
              return (
                <Fragment key={`${i}-${cell.column!.id}`}>
                  {cell.column?.id === TEMPORAL_ID ? (
                    <td class="min-w-80 w-80 max-w-80 px-2 min-h-[100px] h-[100px] border-[0.5px] border-l-0 border-t-0" />
                  ) : (
                    <>
                      <div
                        onMouseUp$={handleMouseUp}
                        class={cn({
                          'relative outline outline-1 outline-primary-300 mt-[0.2px]':
                            selectedCellsId.value.some(
                              (selectedCell) =>
                                selectedCell.column?.id === cell.column?.id &&
                                selectedCell.idx === cell.idx,
                            ),
                        })}
                        onMouseDown$={() => handleMouseDown(cell)}
                        onMouseOver$={() => handleMouseOver(cell)}
                      >
                        <TableCell cell={cell} />

                        {latestCellSelected.value?.column?.id ===
                          cell.column?.id &&
                          latestCellSelected.value?.idx === cell.idx && (
                            <div class="absolute bottom-1 right-4 w-3 h-3 cursor-crosshair z-10">
                              <Button
                                size="sm"
                                look="ghost"
                                class="cursor-crosshair p-1"
                              >
                                <LuDot class="text-5xl text-primary-300" />
                              </Button>
                            </div>
                          )}
                      </div>
                      {/* When the user scrolls until this cell we should load
                        If the user has 20 rows, on rowCount - buffer, should be fetch
                        The buffer now is 2, so on cell number 18, we should fetch new rows
                        Remember: we need just the cellId, no needed the value and the error.
                      */}
                      {actualRowIndex + 1 === rowCount.value - buffer && (
                        <Loader actualRowIndex={actualRowIndex} />
                      )}
                    </>
                  )}

                  <ExecutionFormDebounced column={cell.column} />
                </Fragment>
              );
            })}
          </tr>
        );
      })}
      {/* Bottom spacer row */}
      {bottomSpacerHeight.value > 0 && (
        <tr style={{ height: `${bottomSpacerHeight.value}px` }}>
          <td class="p-0 border-none" colSpan={columns.value.length + 1} />
        </tr>
      )}
    </tbody>
  );
});

const Loader = component$<{ actualRowIndex: number }>(({ actualRowIndex }) => {
  const { columns, replaceCell } = useColumnsStore();
  const isLoading = useSignal(false);

  const loadColumnsCells = server$(
    async ({
      columnIds,
      offset,
      limit,
    }: {
      columnIds: string[];
      offset: number;
      limit: number;
    }) => {
      const allCells = await Promise.all(
        columnIds.map((columnId) =>
          getColumnCells({
            column: {
              id: columnId,
            },
            offset,
            limit,
          }),
        ),
      );

      return allCells.flat();
    },
  );

  useVisibleTask$(async () => {
    if (isLoading.value) return;
    isLoading.value = true;

    const newCells = await loadColumnsCells({
      columnIds: columns.value
        .filter((column) => column.id !== TEMPORAL_ID)
        .map((column) => column.id),
      offset: actualRowIndex,
      limit: 10,
    });

    for (const cell of newCells) {
      replaceCell(cell);
    }

    isLoading.value = false;
  });

  return <Fragment />;
});

const ExecutionFormDebounced = component$<{ column?: { id: Column['id'] } }>(
  ({ column }) => {
    // td for execution form
    const { columnId } = useExecution();

    const state = useStore({
      isVisible: columnId.value === column?.id,
    });

    useTask$(({ track }) => {
      track(() => columnId.value);

      const isVisible = columnId.value === column?.id;

      nextTick(() => {
        state.isVisible = isVisible;
      }, 100);
    });

    if (!state.isVisible) return null;

    return (
      <td class="min-w-[660px] w-[660px] border-[0.5px] bg-neutral-100 border-t-0 border-l-0 border-b-0" />
    );
  },
);
