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
import { usePopover } from '@qwik-ui/headless';
import { cn } from '@qwik-ui/utils';
import { LuTrash } from '@qwikest/icons/lucide';
import { Button, Popover } from '~/components';
import { nextTick } from '~/components/hooks/tick';
import { useExecution } from '~/features/add-column';
import { TableCell } from '~/features/table/table-cell';
import { deleteRowsCells, getColumnCells } from '~/services';
import { type Cell, type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableBody = component$(() => {
  const { columns, firstColumn, deleteCellByIdx } = useColumnsStore();
  const selectedRows = useSignal<number[]>([]);
  usePopover();

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

  return (
    <tbody ref={tableBody}>
      {/* Top spacer row to maintain scroll position */}
      {topSpacerHeight.value > 0 && (
        <tr style={{ height: `${topSpacerHeight.value}px` }}>
          <td class="p-0 border-none" colSpan={columns.value.length + 1} />
        </tr>
      )}

      {data.value.slice(startIndex.value, endIndex.value).map((row, i) => {
        const actualRowIndex = startIndex.value + i;
        return (
          <tr
            key={actualRowIndex}
            class={cn('hover:bg-gray-50/50 transition-colors', {
              'bg-gray-50/50 hover:bg-gray-50/50':
                selectedRows.value.includes(actualRowIndex),
            })}
          >
            <td
              class={cn(
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

            {row.map((cell) => {
              return (
                <Fragment key={`${i}-${cell.column!.id}`}>
                  {cell.column?.id === TEMPORAL_ID ? (
                    <td class="min-w-80 w-80 max-w-80 px-2 min-h-[100px] h-[100px] border-[0.5px] border-l-0 border-t-0" />
                  ) : (
                    <>
                      <TableCell cell={cell} />
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
