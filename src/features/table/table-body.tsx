import {
  $,
  Fragment,
  type HTMLAttributes,
  component$,
  noSerialize,
  useComputed$,
  useSignal,
  useStore,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuDot, LuTrash } from '@qwikest/icons/lucide';
import type { VirtualItem } from '@tanstack/virtual-core';
import { Button, Popover } from '~/components';
import { nextTick } from '~/components/hooks/tick';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { VirtualScrollContainer } from '~/components/ui/virtual-scroll/virtual-scroll';
import { useExecution } from '~/features/add-column';
import { useGenerateColumn } from '~/features/execution';
import { isOverlayOpen } from '~/features/table/components/body/renderer/components/utils';
import { TableCell } from '~/features/table/table-cell';
import { deleteRowsCells } from '~/services';
import {
  type Cell,
  type Column,
  TEMPORAL_ID,
  useColumnsStore,
  useDatasetsStore,
} from '~/state';

export const TableBody = component$(() => {
  const rowSize = 108; // px

  const { activeDataset } = useDatasetsStore();

  const { columns, firstColumn, updateColumn, deleteCellByIdx } =
    useColumnsStore();
  const { onGenerateColumn } = useGenerateColumn();
  const selectedRows = useSignal<number[]>([]);

  const datasetSize = useComputed$(() =>
    Math.max(activeDataset.value?.size || 0, 100),
  );

  const data = useComputed$(() => {
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
            type: column.type,
          },
          updatedAt: new Date(),
          generating: false,
          idx: rowIndex,
        };
      }

      return cell;
    };

    const visibleColumns = columns.value.filter((column) => column.visible);

    return Array.from(
      { length: Math.max(firstColumn.value.cells.length, 100) },
      (_, rowIndex) =>
        Array.from({ length: visibleColumns.length }, (_, colIndex) =>
          getCell(visibleColumns[colIndex], rowIndex),
        ),
    );
  });
  const scrollElement = useSignal<HTMLElement>();
  const dragStartCell = useSignal<Cell>();
  const lastMove = useSignal(0);
  const selectedCellToDrag = useSignal<Cell[]>([]);

  const draggedColumn = useComputed$(() => {
    return columns.value.find(
      (column) => column.id === dragStartCell.value?.column?.id,
    );
  });

  const latestCellSelected = useComputed$(() => {
    return selectedCellToDrag.value[selectedCellToDrag.value.length - 1];
  });

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

  const handleSelectRow$ = $((idx: number) => {
    selectedRows.value = [idx];
  });

  const handleSelectTo$ = $((idx: number) => {
    if (!selectedRows.value.length) return;

    for (let i = selectedRows.value[0] + 1; i <= idx; i++) {
      if (!selectedRows.value.includes(i)) {
        selectedRows.value = [...selectedRows.value, i];
      }
    }
  });

  const handleMouseDown$ = $(async (cell: Cell, e: MouseEvent) => {
    if (await isOverlayOpen()) return;

    dragStartCell.value = cell;
    selectedCellToDrag.value = [cell];

    const tableBeginning = window.innerHeight * 0.25;
    const tableEnding = window.innerHeight * 0.95;

    const currentY = e.clientY;

    if (currentY > tableEnding) {
      scrollElement.value?.scrollBy(0, 60);
    } else if (currentY < tableBeginning) {
      scrollElement.value?.scrollBy(0, -60);
    }
  });

  const handleMouseDragging$ = $((cell: Cell, e: MouseEvent) => {
    if (e.buttons !== 1 /* Primary button not pressed */) return;

    selectedCellToDrag.value = [cell];
  });

  const firstColumnsWithValue = useComputed$(() => {
    return firstColumn.value.cells.filter((c) => !!c.value || !!c.error);
  });

  useVisibleTask$(() => {
    if (firstColumnsWithValue.value.length > 5) return;

    const cell =
      firstColumnsWithValue.value[firstColumnsWithValue.value.length - 1];

    if (!cell?.id) return;

    dragStartCell.value = cell;
    selectedCellToDrag.value = [cell];
  });

  const handleMouseOver$ = $((cell: Cell, e: MouseEvent) => {
    if (e.buttons !== 1 /* Primary button not pressed */) return;

    if (!dragStartCell.value) return;
    if (dragStartCell.value.column?.id !== cell.column?.id) return;

    const isDraggingTheFirstColumn = cell.column?.id === firstColumn.value.id;

    const startRowIndex = dragStartCell.value.idx;
    const endRowIndex = cell.idx;
    const start = Math.min(startRowIndex, endRowIndex);
    const end = Math.max(startRowIndex, endRowIndex);

    if (end > firstColumnsWithValue.value.length && !isDraggingTheFirstColumn) {
      return;
    }

    const selectedCells = [];

    for (let i = start; i <= end; i++) {
      selectedCells.push(
        data.value[i].find((c) => c.column?.id === cell.column?.id),
      );
    }

    selectedCellToDrag.value = selectedCells.filter((c) => c) as Cell[];
  });

  const handleMouseUp$ = $(async () => {
    if (!dragStartCell.value) return;
    if (!draggedColumn.value) return;
    if (!draggedColumn.value.process?.id) return;
    if (selectedCellToDrag.value.length === 1) return;

    const column = draggedColumn.value;
    dragStartCell.value = undefined;

    const offset = selectedCellToDrag.value[0].idx;
    const limit = latestCellSelected.value?.idx - offset + 1;

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
  });

  const handleMouseMove$ = $(async (e: MouseEvent) => {
    if (e.buttons !== 1 /* Primary button not pressed */) return;
    if (await isOverlayOpen()) return;

    if (!dragStartCell.value) return;

    const tableBeginning = window.innerHeight * 0.25;
    const tableEnding = window.innerHeight * 0.9;

    const currentY = e.clientY;

    const endingScroll = currentY - tableEnding;
    const beginningScroll = tableBeginning - currentY;

    if (endingScroll > 0 && currentY > lastMove.value) {
      scrollElement.value?.scrollBy(0, 20);
    } else if (beginningScroll > 0 && currentY < lastMove.value) {
      scrollElement.value?.scrollBy(0, -20);
    }

    lastMove.value = currentY;
  });

  const itemRenderer = $(
    (
      item: VirtualItem,
      loadedData: Cell[],
      props: HTMLAttributes<HTMLElement>,
    ) => {
      const getBoundary = (cell: Cell) => {
        if (
          selectedCellToDrag.value.length === 0 ||
          columns.value.find((c) => c.id === cell.column?.id)?.kind === 'static'
        )
          return;

        const rows = selectedCellToDrag.value.map((c) => c.idx);
        const rowMin = Math.min(...rows);
        const rowMax = Math.max(...rows);

        const isColumnSelected = selectedCellToDrag.value.some(
          (c) => c.column?.id === cell.column?.id && c.idx === cell.idx,
        );
        const isRowSelected = selectedCellToDrag.value.some(
          (c) => c.column?.id === cell.column?.id && cell.idx === rowMin,
        );
        const isRowMaxSelected = selectedCellToDrag.value.some(
          (c) => c.column?.id === cell.column?.id && cell.idx === rowMax,
        );

        return cn({
          'border-t-2 border-t-primary-300': isRowSelected,
          'border-b-2 border-b-primary-300': isRowMaxSelected,
          'border-l-2 border-l-primary-300': isColumnSelected,
          'border-r-2 border-r-primary-300': isColumnSelected,
          'bg-primary-100/50 hover:bg-primary-100/50':
            !dragStartCell.value &&
            selectedCellToDrag.value.length > 1 &&
            isColumnSelected,
        });
      };

      return (
        <tr
          class={cn({
            'bg-gray-50/50 hover:bg-gray-50/50': selectedRows.value.includes(
              item.index,
            ),
          })}
          data-index={item.index}
          {...props}
        >
          <td
            class={cn(
              'sticky left-0 z-30 min-w-10 w-10 text-sm flex justify-center items-center',
              'px-1 text-center border bg-neutral-100 select-none',
              {
                'bg-neutral-200': selectedRows.value.includes(item.index),
              },
            )}
            preventdefault:contextmenu
            onClick$={(e) => {
              if (e.shiftKey) {
                handleSelectTo$(item.index);
              } else {
                handleSelectRow$(item.index);
              }
            }}
            onContextMenu$={async () => {
              if (selectedRows.value.length === 0) {
                await handleSelectRow$(item.index);
              }

              if (!selectedRows.value.includes(item.index)) return;

              nextTick(() => {
                document
                  .getElementById(`delete-row-${item.index}-panel`)
                  ?.showPopover();
              }, 200);
            }}
          >
            <Popover.Root
              gutter={10}
              floating="top-end"
              id={`delete-row-${item.index}`}
            >
              <Popover.Trigger class="pointer-events-none">
                {item.index + 1}
              </Popover.Trigger>

              <Popover.Panel
                class="shadow-none p-0 w-fit bg-transparent border-none"
                stoppropagation:click
              >
                <Button
                  look="ghost"
                  onClick$={() => handleDeleteClick$(item.index)}
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

          {loadedData?.map((cell) => {
            return (
              <Fragment key={`${cell.idx}-${cell.column!.id}`}>
                {cell.column?.id === TEMPORAL_ID ? (
                  <td class="relative min-w-[326px] w-[326px] max-w-[326px] h-[108px] border" />
                ) : (
                  <td
                    data-column-id={cell.column?.id}
                    class={cn(
                      'relative transition-colors box-border w-[326px] h-[108px] break-words align-top border border-neutral-300 hover:bg-gray-50/50',
                      getBoundary(cell),
                    )}
                  >
                    <div
                      onMouseUp$={handleMouseUp$}
                      onMouseDown$={(e) => handleMouseDown$(cell, e)}
                      onMouseOver$={(e) => handleMouseOver$(cell, e)}
                      onMouseMove$={handleMouseMove$}
                    >
                      <TableCell cell={cell} />

                      {latestCellSelected.value?.column?.id ===
                        cell.column?.id &&
                        latestCellSelected.value &&
                        latestCellSelected.value?.idx === cell.idx && (
                          <div class="absolute bottom-1 right-4 w-3 h-3 z-10">
                            {columns.value.find((c) => c.id === cell.column?.id)
                              ?.kind !== 'static' && (
                              <Button
                                size="sm"
                                look="ghost"
                                class="cursor-crosshair p-1 z-50"
                                onMouseDown$={(e) =>
                                  handleMouseDragging$(cell, e)
                                }
                              >
                                <Tooltip
                                  open={
                                    firstColumn.value.id === cell.column?.id &&
                                    item.index === 4
                                  }
                                  text="Drag down to generate cells"
                                  gutter={1}
                                  floating="right-start"
                                >
                                  <LuDot class="text-5xl text-primary-300" />
                                </Tooltip>
                              </Button>
                            )}
                          </div>
                        )}
                    </div>
                  </td>
                )}

                <ExecutionFormDebounced column={cell.column} />
              </Fragment>
            );
          })}
        </tr>
      );
    },
  );

  useVisibleTask$(() => {
    scrollElement.value = document.querySelector('.scrollable') as HTMLElement;
  });

  if (!scrollElement.value) return null;

  return (
    <tbody
      class="grid relative"
      style={{
        height: `${datasetSize.value * rowSize}px`,
      }}
    >
      <VirtualScrollContainer
        key={datasetSize.value}
        totalCount={datasetSize.value}
        estimateSize={rowSize}
        data={data}
        itemRenderer={itemRenderer}
        scrollElement={scrollElement}
      />
    </tbody>
  );
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
      <td class="min-w-[660px] w-[660px] border bg-neutral-100 border-t-0 border-l-0 border-b-0" />
    );
  },
);
