import {
  $,
  Fragment,
  component$,
  useComputed$,
  useOnWindow,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { useExecution } from '~/features/add-column';
import { TableCell } from '~/features/table/table-cell';
import { getColumnCells } from '~/services';
import { type Cell, type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableBody = component$(() => {
  const { columns, firstColum } = useColumnsStore();
  const { columnId } = useExecution();
  const expandedRows = useSignal<Set<number>>(new Set());

  const tableBody = useSignal<HTMLElement>();
  const rowHeight = 100;
  const visibleRowCount = 10;
  const buffer = 2;

  const scrollTop = useSignal(0);
  const startIndex = useSignal(0);
  const endIndex = useSignal(0);

  const data = useSignal<Cell[][]>([]);
  const rowCount = useSignal(0);

  useOnWindow(
    'scroll',
    $((event) => {
      const target = event.target as HTMLElement;

      if (!target.classList.contains('scrollable')) return;

      scrollTop.value = target.scrollTop - tableBody.value!.offsetTop;
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

    rowCount.value = firstColum.value.cells.length;

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
          generating: false,
          idx: rowIndex,
        };
      }

      return cell;
    };

    data.value = Array.from({ length: rowCount.value }, (_, rowIndex) =>
      Array.from(
        { length: columns.value.filter((c) => c.visible).length },
        (_, colIndex) =>
          getCell(columns.value.filter((c) => c.visible)[colIndex], rowIndex),
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
          <td
            colSpan={columns.value.length + 1}
            style={{ padding: 0, border: 'none' }}
          />
        </tr>
      )}

      {data.value.slice(startIndex.value, endIndex.value).map((row, index) => {
        const actualRowIndex = startIndex.value + index;
        return (
          <tr
            key={actualRowIndex}
            class="hover:bg-gray-50/50 transition-colors"
          >
            {row.map((cell) => {
              return (
                <Fragment key={cell.id}>
                  {cell.column?.id === TEMPORAL_ID ? (
                    <td class="min-w-80 w-80 max-w-80 px-2 min-h-[100px] h-[100px] border-[0.5px] border-t-0" />
                  ) : (
                    <>
                      <TableCell
                        cell={cell}
                        isExpanded={expandedRows.value.has(actualRowIndex)}
                        onToggleExpand$={() => {
                          const newSet = new Set(expandedRows.value);
                          if (newSet.has(actualRowIndex)) {
                            newSet.delete(actualRowIndex);
                          } else {
                            newSet.add(actualRowIndex);
                          }
                          expandedRows.value = newSet;
                        }}
                      />

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

                  {columnId.value === cell.column?.id && (
                    <td class="min-w-[700px] w-[700px] bg-white" />
                  )}
                </Fragment>
              );
            })}

            {/* td for (add + ) column */}
            <td class="min-w-80 w-80 max-w-80 min-h-[100px] h-[100px] border-[0.5px] border-t-0 border-r-0" />
          </tr>
        );
      })}

      {/* Bottom spacer row */}
      {bottomSpacerHeight.value > 0 && (
        <tr style={{ height: `${bottomSpacerHeight.value}px` }}>
          <td
            colSpan={columns.value.length + 1}
            style={{ padding: 0, border: 'none' }}
          />
        </tr>
      )}
    </tbody>
  );
});

const Loader = component$<{ actualRowIndex: number }>(({ actualRowIndex }) => {
  const { columns, replaceCell } = useColumnsStore();

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
  });

  return <Fragment />;
});
