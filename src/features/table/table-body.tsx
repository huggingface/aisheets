import {
  $,
  Fragment,
  component$,
  noSerialize,
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
import { LuTrash } from '@qwikest/icons/lucide';
import { Button, Popover } from '~/components';
import { nextTick } from '~/components/hooks/tick';
import { useExecution } from '~/features/add-column';
import { useGenerateColumn } from '~/features/execution';
import { TableCell } from '~/features/table/table-cell';
import { deleteRowsCells, getColumnCells } from '~/services';
import { type Cell, type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableBody = component$(() => {
  const { columns, firstColumn, updateColumn, deleteCellByIdx } =
    useColumnsStore();
  const { onGenerateColumn } = useGenerateColumn();
  const selectedRows = useSignal<number[]>([]);

  const tableBody = useSignal<HTMLElement>();
  const rowHeight = 100;
  const visibleRowCount = 10;
  const buffer = 2;

  const scrollTop = useSignal(0);
  const startIndex = useSignal(0);
  const endIndex = useSignal(0);

  const data = useSignal<Cell[][]>([]);
  const rowCount = useSignal(0);

  const handleSelectRow$ = $((idx: number) => {
    selectedRows.value = [idx];
  });

  const handleSelectTo$ = $((idx: number) => {
    if (!selectedRows.value.length) return;

    for (let i = selectedRows.value[0] + 1; i <= idx; i++) {
      selectedRows.value = [...selectedRows.value, i];
    }
  });

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

  const handleDeleteClick$ = $(async (actualRowIndex: number) => {
    document
      .getElementById(`delete-row-${actualRowIndex}-panel`)
      ?.hidePopover();

    const ok = await server$(deleteRowsCells)(
      firstColumn.value.dataset.id,
      selectedRows.value,
    );

    if (ok) {
      deleteCellByIdx(...selectedRows.value);

      selectedRows.value = [];
    }
  });

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
    track(rowCount);

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

  const dragStartCell = useSignal<Cell>();

  useTask$(({ track }) => {
    track(() => firstColumn.value.cells.length);

    if (dragStartCell.value || firstColumn.value.process?.isExecuting) return;

    rowCount.value = Math.max(firstColumn.value.cells.length, 8);
  });

  const handleMouseDown$ = $((cell: Cell) => {
    selectedCellsId.value = [cell];
  });

  const handleMouseDragging$ = $((cell: Cell) => {
    dragStartCell.value = cell;

    selectedCellsId.value = [cell];
  });

  const handleMouseOver$ = $((cell: Cell) => {
    if (dragStartCell.value) {
      if (dragStartCell.value.column?.id !== cell.column?.id) return;
      const scrollable = document.querySelector('.scrollable')!;

      const isDraggingTheFirstColumn = cell.column?.id === firstColumn.value.id;

      const startRowIndex = dragStartCell.value.idx;
      const endRowIndex = cell.idx;
      const start = Math.min(startRowIndex, endRowIndex);
      const end = Math.max(startRowIndex, endRowIndex);

      if (end + 1 > firstColumn.value.cells.length && !isDraggingTheFirstColumn)
        return;

      scrollable.scrollTo({
        top: scrollable.scrollHeight + rowHeight,
        behavior: 'smooth',
      });

      if (end + buffer >= rowCount.value && isDraggingTheFirstColumn) {
        rowCount.value += 1;
      }

      const selectedCells = [];

      for (let i = start; i <= end; i++) {
        selectedCells.push(
          data.value[i].find((c) => c.column?.id === cell.column?.id),
        );
      }

      selectedCellsId.value = selectedCells.filter((c) => c) as Cell[];
    }
  });

  const handleMouseUp$ = $(async () => {
    if (dragStartCell.value) {
      const column = columns.value.find(
        (column) => column.id === dragStartCell.value?.column?.id,
      );
      if (!column) return;
      if (!dragStartCell.value.value) return;

      let offset = 0;
      for (const cell of selectedCellsId.value) {
        offset = cell.idx;

        if (!cell.value) {
          break;
        }
      }

      const limit = latestCellSelected.value?.idx - offset + 1;

      dragStartCell.value = undefined;

      const selectedCellsHasValue = column.cells.some(
        (c) => c.idx >= offset && c.idx <= limit + offset && c.value,
      );
      if (selectedCellsHasValue) return;

      column.process!.cancellable = noSerialize(new AbortController());
      column.process!.isExecuting = true;

      updateColumn(column);

      await onGenerateColumn({
        ...column,
        process: {
          ...column.process!,
          offset,
          limit,
        },
      });
    }
  });

  const getBoundary = (cell: Cell) => {
    const sel = selectedCellsId.value;
    if (sel.length === 0) {
      return { rowMin: -1, rowMax: -1, colMin: -1, colMax: -1 };
    }
    const rows = sel.map((c) => c.idx);
    const rowMin = Math.min(...rows);
    const rowMax = Math.max(...rows);

    const isColumnSelected = selectedCellsId.value.some(
      (c) => c.column?.id === cell.column?.id && c.idx === cell.idx,
    );
    const isRowSelected = selectedCellsId.value.some(
      (c) => c.column?.id === cell.column?.id && cell.idx === rowMin,
    );
    const isRowMaxSelected = selectedCellsId.value.some(
      (c) => c.column?.id === cell.column?.id && cell.idx === rowMax,
    );

    return cn({
      'border-t-2 border-t-primary-300': isRowSelected,
      'border-b-2 border-b-primary-300': isRowMaxSelected,
      'border-l-2 border-l-primary-300': isColumnSelected,
      'border-r-2 border-r-primary-300': isColumnSelected,
      'bg-primary-100/50':
        !dragStartCell.value &&
        selectedCellsId.value.length > 1 &&
        isColumnSelected,
    });
  };

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
            class={cn('hover:bg-gray-50/50 transition-colors group', {
              'bg-gray-50/50 hover:bg-gray-50/50':
                selectedRows.value.includes(actualRowIndex),
            })}
          >
            <td
              class={cn(
                'sticky left-0 z-[10]',
                'px-2 text-center border-[0.5px] border-t-0 bg-neutral-100 select-none',
                {
                  'bg-neutral-200': selectedRows.value.includes(actualRowIndex),
                },
              )}
              preventdefault:contextmenu
              onClick$={(e) => {
                if (e.shiftKey) {
                  handleSelectTo$(actualRowIndex);
                } else {
                  handleSelectRow$(actualRowIndex);
                }
              }}
              onContextMenu$={async () => {
                if (selectedRows.value.length === 0) {
                  await handleSelectRow$(actualRowIndex);
                }

                if (!selectedRows.value.includes(actualRowIndex)) return;

                nextTick(() => {
                  document
                    .getElementById(`delete-row-${actualRowIndex}-panel`)
                    ?.showPopover();
                }, 200);
              }}
            >
              <Popover.Root
                gutter={10}
                floating="top-end"
                id={`delete-row-${actualRowIndex}`}
              >
                <Popover.Trigger class="pointer-events-none">
                  {actualRowIndex + 1}
                </Popover.Trigger>

                <Popover.Panel
                  class="shadow-none p-0 w-fit bg-transparent border-none"
                  stoppropagation:click
                >
                  <Button
                    look="ghost"
                    onClick$={() => handleDeleteClick$(actualRowIndex)}
                    class="w-fit p-1 rounded-md border bg-white"
                  >
                    <div class="hover:bg-neutral-100 p-1 rounded-sm flex justify-start items-center">
                      <LuTrash class="text-neutral mr-1" />
                      Delete {selectedRows.value.length > 1 ? 'rows' : 'row'}
                    </div>
                  </Button>
                </Popover.Panel>
              </Popover.Root>
            </td>

            {rows.map((cell) => {
              return (
                <Fragment key={`${i}-${cell.column!.id}`}>
                  {cell.column?.id === TEMPORAL_ID ? (
                    <td class="min-w-80 w-80 max-w-80 px-2 min-h-[100px] h-[100px] border-[0.5px] border-l-0 border-t-0" />
                  ) : (
                    <td
                      class={cn(
                        'relative box-border min-w-[326px] w-[326px] max-w-[326px] h-[108px] cursor-pointer break-words align-top border-[0.5px] border-l-0 border-t-0',
                        getBoundary(cell),
                      )}
                    >
                      <div
                        onMouseUp$={handleMouseUp$}
                        onMouseDown$={() => handleMouseDown$(cell)}
                        onMouseOver$={() => handleMouseOver$(cell)}
                      >
                        <TableCell cell={cell} />

                        {latestCellSelected.value?.column?.id ===
                          cell.column?.id &&
                          latestCellSelected.value.value &&
                          latestCellSelected.value?.idx === cell.idx && (
                            <div class="absolute bottom-1 right-4 w-3 h-3 cursor-crosshair z-10">
                              <Button
                                size="sm"
                                look="ghost"
                                class="cursor-crosshair p-1"
                                onMouseDown$={() => handleMouseDragging$(cell)}
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
                    </td>
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
