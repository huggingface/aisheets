import {
  $,
  Fragment,
  component$,
  useComputed$,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { Button } from '~/components/ui';
import { useExecution } from '~/features/add-column';
import { TableCell } from '~/features/table/table-cell';
import { getColumnCells } from '~/services/repository/cells';
import { type Cell, type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const loadColumnsCells = server$(
  async ({
    columns,
    offset,
    limit,
  }: {
    columns: Column[];
    offset: number;
    limit: number;
  }) => {
    const allCells = [];
    let currentRowIdx = 0;

    for (const column of columns) {
      if (column.id === TEMPORAL_ID) {
        continue;
      }

      const cells = await getColumnCells({
        column,
        offset,
        limit,
      });
      allCells.push(cells);
      currentRowIdx = Math.max(currentRowIdx, cells.length);
    }

    return { cells: allCells.flat(), rowIdx: currentRowIdx + offset };
  },
);

export const TableBody = component$(() => {
  const { state: columns } = useColumnsStore();

  const rowsToShow = useComputed$(() => {
    return columns.value[0].cells.length;
  });

  const { columnId } = useExecution();
  const expandedRows = useSignal<Set<number>>(new Set());

  const getCell = (column: Column, rowIndex: number): Cell => {
    const cell = column.cells[rowIndex];

    if (!cell) {
      // Temporal cell for skeleton
      return {
        id: `${column.id}-${rowIndex}`,
        value: '',
        error: '',
        validated: false,
        column: {
          id: column.id,
        },
        updatedAt: new Date(),
        generated: false,
        idx: rowIndex,
      };
    }

    return cell;
  };

  return (
    <>
      <tbody>
        {Array.from({ length: rowsToShow.value }).map((_, rowIndex) => (
          <tr key={rowIndex} class="hover:bg-gray-50/50 transition-colors">
            {columns.value.map((column) => {
              const cell = getCell(column, rowIndex);

              return (
                <Fragment key={`${column.id}-${rowIndex}-${cell.id}`}>
                  {column.id === TEMPORAL_ID ? (
                    <td
                      key={`temporal-${rowIndex}`}
                      class="min-w-80 w-80 max-w-80 px-2 min-h-[100px] h-[100px] border-[0.5px]"
                    />
                  ) : (
                    <TableCell
                      cell={cell}
                      isExpanded={expandedRows.value.has(rowIndex)}
                      onToggleExpand$={() => {
                        const newSet = new Set(expandedRows.value);
                        if (newSet.has(rowIndex)) {
                          newSet.delete(rowIndex);
                        } else {
                          newSet.add(rowIndex);
                        }
                        expandedRows.value = newSet;
                      }}
                    />
                  )}

                  {columnId.value === column.id && (
                    <td class="min-w-[600px] w-[600px] bg-white" />
                  )}
                </Fragment>
              );
            })}

            {/* td for (add + ) column */}
            <td
              key={rowIndex}
              class="min-w-80 w-80 max-w-80 min-h-[100px] h-[100px] border-[0.5px] border-r-0"
            />
          </tr>
        ))}

        <td>
          <LoaderContainer />
        </td>
      </tbody>
    </>
  );
});

const LoaderContainer = component$(() => {
  const { state: columns, replaceCells } = useColumnsStore();

  const lastRowIdx = useSignal<number>(0);
  const isLoading = useSignal(false);

  const loadMoreAction = $(async () => {
    isLoading.value = true;

    const newOffset = lastRowIdx.value;
    const { cells: newCells, rowIdx } = await loadColumnsCells({
      columns: columns.value,
      offset: newOffset,
      limit: 20,
    });

    replaceCells(newCells);
    lastRowIdx.value = rowIdx;
    isLoading.value = false;
  });

  useVisibleTask$(async ({ cleanup }) => {
    await loadMoreAction();

    cleanup(() => {
      lastRowIdx.value = 0;
      isLoading.value = false;
    });
  });

  return !isLoading.value ? (
    <Button class="w-full text-center" onClick$={loadMoreAction}>
      Load more
    </Button>
  ) : (
    <></>
  );
});
