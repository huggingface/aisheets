import {
  $,
  Fragment,
  component$,
  useComputed$,
  useOnWindow,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';
import { useExecution } from '~/features/add-column';
import { TableCell } from '~/features/table/table-cell';
import { type Cell, type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableBody = component$(() => {
  const { state: columns, firstColum } = useColumnsStore();
  const { columnId } = useExecution();
  const expandedRows = useSignal<Set<number>>(new Set());

  const tableBody = useSignal<HTMLElement>();
  const rowHeight = 21;
  const visibleRows = 9;
  const buffer = 9;

  const scrollTop = useSignal(0);
  const startIndex = useSignal(0);
  const endIndex = useSignal(0);

  const rowCount = useComputed$(() => {
    return firstColum.value.process?.limit || firstColum.value.cells.length;
  });

  useVisibleTask$(({ track }) => {
    track(scrollTop);
    startIndex.value = Math.max(
      Math.floor(scrollTop.value / rowHeight) - buffer,
      0,
    );

    endIndex.value = Math.min(
      startIndex.value + visibleRows + buffer,
      rowCount.value,
    );
  });

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

  const data = useSignal<number[][]>([]);
  data.value = Array.from({ length: rowCount.value }, (_) =>
    Array.from({ length: columns.value.length }, (_, colIndex) => colIndex),
  );

  useOnWindow(
    'scroll',
    $((event) => {
      console.log('scroll', (event.target as HTMLElement).scrollTop);
      scrollTop.value =
        (event.target as HTMLElement).scrollTop - tableBody.value!.offsetTop;
    }),
  );

  return (
    <tbody ref={tableBody}>
      {data.value.slice().map((row, rowIndex) => (
        <tr key={rowIndex} class="hover:bg-gray-50/50 transition-colors">
          {row.map((col) => {
            const column = columns.value[col];
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
          <td class="min-w-80 w-80 max-w-80 min-h-[100px] h-[100px] border-[0.5px] border-r-0" />
        </tr>
      ))}
    </tbody>
  );
});
