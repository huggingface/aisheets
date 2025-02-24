import { component$, useSignal } from '@builder.io/qwik';
import { useExecution } from '~/features/add-column';
import { TableCell } from '~/features/table/table-cell';
import { type Cell, type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableBody = component$(() => {
  const { state: columns } = useColumnsStore();
  const { columnId } = useExecution();
  const rowCount = columns.value[0]?.process?.limit ?? 0;
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
        column,
        updatedAt: new Date(),
        generated: false,
        idx: rowIndex,
      };
    }

    return cell;
  };

  return (
    <tbody>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex} class="hover:bg-gray-50/50 transition-colors">
          {columns.value.map((column) => {
            const cell = getCell(column, rowIndex);

            return (
              <>
                {column.id === TEMPORAL_ID ? (
                  <td
                    key={`temporal-${rowIndex}`}
                    class="min-w-80 w-80 max-w-80 px-2 min-h-[100px] h-[100px] border-[0.5px]"
                  />
                ) : (
                  <TableCell
                    key={cell.id}
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
              </>
            );
          })}

          {/* td for (add + ) column */}
          <td class="min-w-80 w-80 max-w-80 min-h-[100px] h-[100px] border-[0.5px] border-r-0" />
        </tr>
      ))}
    </tbody>
  );
});
