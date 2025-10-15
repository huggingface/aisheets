import {
  $,
  component$,
  Fragment,
  type HTMLAttributes,
  useComputed$,
  useSignal,
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
import { useColumnsPreference } from '~/features/table/components/context/colunm-preferences.context';
import { TableCell } from '~/features/table/table-cell';
import { deleteRowsCells, getColumnsCells } from '~/services';
import {
  type Cell,
  type Column,
  useColumnsStore,
  useDatasetsStore,
} from '~/state';

function getRowData(rowIndex: number, columns: Column[]): Cell[] {
  const rowData: Cell[] = columns.map((column) => {
    return {
      id: undefined,
      idx: rowIndex,
      value: undefined,
      error: undefined,
      column: column,
      generating: false,
      updatedAt: new Date(),
      validated: false,
    };
  });

  columns.forEach((column, colIdx) => {
    const cell = column.cells.find((cell) => cell.idx === rowIndex);
    if (cell) rowData[colIdx] = cell;
  });

  return rowData;
}

export const TableBody = component$(() => {
  const rowSize = 105; // px

  const { columnId } = useExecution();
  const { columnPreferences, showAiButton, hideAiButton } =
    useColumnsPreference();
  const { activeDataset } = useDatasetsStore();

  const { columns, firstColumn, updateColumn, deleteCellByIdx } =
    useColumnsStore();
  const { onGenerateColumn } = useGenerateColumn();
  const selectedRows = useSignal<number[]>([]);

  const datasetSize = useComputed$(() => activeDataset.value!.size);
  const datasetId = useComputed$(() => activeDataset.value!.id);

  const pageSize = 30;
  const buffer = 5;
  const currentRange = useSignal<{ start: number; end: number }>({
    start: -1,
    end: -1,
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
      activeDataset.value!.id,
      selectedRows.value,
    );

    if (ok) {
      deleteCellByIdx(...selectedRows.value);

      selectedRows.value = [];
    }
  });
  const visibleColumns = useComputed$(() => {
    return columns.value.filter((column) => column.visible);
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
    return firstColumn.value?.cells.filter((c) => !!c.value || !!c.error);
  });

  useVisibleTask$(() => {
    if (!firstColumnsWithValue.value?.length) return;

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

    const startRowIndex = dragStartCell.value.idx;
    const endRowIndex = cell.idx;
    const start = Math.min(startRowIndex, endRowIndex);
    const end = Math.max(startRowIndex, endRowIndex);

    const selectedCells = [];
    for (let i = start; i <= end; i++) {
      const rowData = getRowData(i, visibleColumns.value);
      selectedCells.push(
        rowData?.find((c) => c?.column?.id === cell.column?.id),
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

    await onGenerateColumn({
      ...column,
      process: {
        ...column.process!,
        offset,
        limit,
      },
    });
  });

  const fetchMoreData$ = $(
    async ({ start, end }: { start: number; end: number }) => {
      const dataset = activeDataset.value;
      if (!dataset) return;

      if (start >= dataset.size) return;

      currentRange.value = { start, end };

      const offset = start;
      const limit = end - start + 1;

      if (offset < 0) return;
      if (limit <= 0) return;

      await server$(getColumnsCells)({
        columns: visibleColumns.value,
        offset,
        limit,
      }).then((columnsWithCells) => {
        columnsWithCells.forEach(({ id, cells }) => {
          const column = columns.value.find((c) => c.id === id);
          if (!column) return;

          // merge cells by removing duplicates
          column.cells = column.cells.filter(
            (existingCell) =>
              !cells.find((newCell) => newCell.idx === existingCell.idx),
          );

          column.cells = cells;

          updateColumn(column);
        });
      });
    },
  );

  const handleMouseMove$ = $(async (e: MouseEvent) => {
    if (e.buttons !== 1 /* Primary button not pressed */) return;
  });

  const rowRenderer = $(
    (
      item: VirtualItem,
      props: HTMLAttributes<HTMLElement>,
      _isLoading: boolean,
    ) => {
      const getBoundary = (i: number, j: number) => {
        const column = visibleColumns.value[j];

        if (
          selectedCellToDrag.value.length === 0 ||
          columns.value.find((c) => c.id === column?.id)?.kind === 'static'
        )
          return;

        const rows = selectedCellToDrag.value.map((c) => c.idx);
        const rowMin = Math.min(...rows);
        const rowMax = Math.max(...rows);

        const isColumnSelected = selectedCellToDrag.value.some(
          (c) => c.column?.id === column?.id && c.idx === i,
        );
        const isRowSelected = selectedCellToDrag.value.some(
          (c) => c.column?.id === column?.id && i === rowMin,
        );
        const isRowMaxSelected = selectedCellToDrag.value.some(
          (c) => c.column?.id === column?.id && i === rowMax,
        );

        return cn({
          'shadow-[inset_0_3px_0_0_theme(colors.primary.300)]':
            isRowSelected && !isRowMaxSelected && !isColumnSelected,
          'shadow-[inset_0_-3px_0_0_theme(colors.primary.300)]':
            isRowMaxSelected && !isRowSelected && !isColumnSelected,
          'shadow-[inset_3px_0_0_0_theme(colors.primary.300),inset_-3px_0_0_0_theme(colors.primary.300)]':
            isColumnSelected && !isRowSelected && !isRowMaxSelected,
          'shadow-[inset_0_3px_0_0_theme(colors.primary.300),inset_3px_0_0_0_theme(colors.primary.300),inset_-3px_0_0_0_theme(colors.primary.300)]':
            isRowSelected && isColumnSelected && !isRowMaxSelected,
          'shadow-[inset_0_-3px_0_0_theme(colors.primary.300),inset_3px_0_0_0_theme(colors.primary.300),inset_-3px_0_0_0_theme(colors.primary.300)]':
            isRowMaxSelected && isColumnSelected && !isRowSelected,
          'shadow-[inset_0_3px_0_0_theme(colors.primary.300),inset_0_-3px_0_0_theme(colors.primary.300)]':
            isRowSelected && isRowMaxSelected && !isColumnSelected,
          'shadow-[inset_0_3px_0_0_theme(colors.primary.300),inset_0_-3px_0_0_theme(colors.primary.300),inset_3px_0_0_0_theme(colors.primary.300),inset_-3px_0_0_0_theme(colors.primary.300)]':
            isRowSelected && isRowMaxSelected && isColumnSelected,

          'bg-primary-100/50 hover:bg-primary-100/50':
            !dragStartCell.value &&
            selectedCellToDrag.value.length > 1 &&
            isColumnSelected,
        });
      };

      const rowData = getRowData(item.index, visibleColumns.value);

      return (
        <tr
          class={cn({
            'bg-gray-50/50 hover:bg-gray-50/50': selectedRows.value.includes(
              item.index,
            ),
          })}
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

          {rowData?.map((cell, columnIndex) => {
            return (
              <Fragment key={`${item.index}-${columnIndex}`}>
                <td
                  data-column-id={visibleColumns.value[columnIndex]?.id}
                  class={cn(
                    `relative transition-colors min-w-[142px] w-[326px] h-[${rowSize}px] break-words align-top border border-neutral-300 hover:bg-gray-50/50`,
                    {
                      'bg-blue-50 hover:bg-blue-100':
                        visibleColumns.value[columnIndex]!.id == columnId.value,
                      'shadow-[inset_2px_0_0_theme(colors.primary.100),inset_-2px_0_0_theme(colors.primary.100)]':
                        columnPreferences.value[
                          visibleColumns.value[columnIndex]!.id
                        ]?.aiButtonHover,
                      'shadow-[inset_2px_0_0_theme(colors.primary.300),inset_-2px_0_0_theme(colors.primary.300)]':
                        columnPreferences.value[
                          visibleColumns.value[columnIndex]!.id
                        ]?.aiPromptOpen,
                    },
                    getBoundary(item.index, columnIndex),
                  )}
                  style={{
                    width: `${columnPreferences.value[visibleColumns.value[columnIndex]!.id]?.width || 326}px`,
                  }}
                  onMouseOver$={() =>
                    showAiButton(visibleColumns.value[columnIndex]!.id)
                  }
                  onMouseLeave$={() =>
                    hideAiButton(visibleColumns.value[columnIndex]!.id)
                  }
                >
                  <div
                    onMouseUp$={handleMouseUp$}
                    onMouseDown$={(e) => handleMouseDown$(cell, e)}
                    onMouseOver$={(e) => handleMouseOver$(cell, e)}
                    onMouseMove$={handleMouseMove$}
                  >
                    <TableCell
                      key={`${item.index}_${columnIndex}`}
                      cell={cell}
                    />

                    {latestCellSelected.value?.column?.id ===
                      visibleColumns.value[columnIndex]?.id &&
                      latestCellSelected.value &&
                      latestCellSelected.value?.idx === cell.idx && (
                        <div class="absolute bottom-1 right-7 w-3 h-3 z-10">
                          {visibleColumns.value.find(
                            (c) =>
                              c.id === visibleColumns.value[columnIndex]?.id,
                          )?.kind !== 'static' && (
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
                                  firstColumn.value?.id ===
                                    visibleColumns.value[columnIndex]?.id &&
                                  item.index === 4
                                }
                                text="Drag down to generate cells"
                                floating="right"
                              >
                                <LuDot class="text-7xl text-primary-300" />
                              </Tooltip>
                            </Button>
                          )}
                        </div>
                      )}
                  </div>
                </td>
              </Fragment>
            );
          })}
        </tr>
      );
    },
  );

  useVisibleTask$(() => {
    return () => {
      dragStartCell.value = undefined;
      selectedCellToDrag.value = [];
      lastMove.value = 0;
      selectedRows.value = [];
      scrollElement.value = undefined;
      currentRange.value = { start: -1, end: -1 };
    };
  });

  useVisibleTask$(() => {
    scrollElement.value = document.querySelector('.scrollable') as HTMLElement;

    return () => {
      scrollElement.value = undefined;
    };
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
        key={datasetId.value}
        totalCount={datasetSize.value}
        currentRange={currentRange}
        estimateSize={rowSize}
        buffer={buffer}
        pageSize={pageSize}
        overscan={1}
        itemRenderer={rowRenderer}
        loadNextPage={fetchMoreData$}
        scrollElement={scrollElement}
        debug={false}
      />
    </tbody>
  );
});
