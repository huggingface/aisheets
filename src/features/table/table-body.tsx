import { component$ } from '@builder.io/qwik';
import { TableCell } from '~/features/table/table-cell';
import { type Cell, type Column, useColumnsStore } from '~/state';

export const TableBody = component$(() => {
  const { state: columns } = useColumnsStore();
  const rowCount = columns.value[0]?.cells.length || 0;

  const getCell = (column: Column, rowIndex: number): Cell => {
    const cell = column.cells[rowIndex];

    if (!cell) {
      return {
        id: `${column.id}-${rowIndex}`,
        value: '',
        error: '',
        validated: false,
        columnId: column.id,
        updatedAt: new Date(),
        idx: rowIndex,
      };
    }

    return cell;
  };

  return (
    <tbody>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr
          key={rowIndex}
          class="border-b border-gray-200 hover:bg-gray-50/50 transition-colors"
        >
          {columns.value.map((column) => {
            const cell = getCell(column, rowIndex);
            return (
              <TableCell
                key={`${cell.id}-${cell.updatedAt}`}
                cell={cell}
                class="border-r border-gray-200 last:border-r-0"
              />
            );
          })}
        </tr>
      ))}
    </tbody>
  );
});
