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
        <tr key={rowIndex} class="hover:bg-gray-100">
          <td class="max-w-6 border px-2 py-2 text-center">
            <input type="checkbox" />
          </td>
          {columns.value.map((column) => {
            const cell = getCell(column, rowIndex);

            return (
              <TableCell key={`${cell.id}-${cell.updatedAt}`} cell={cell} />
            );
          })}
        </tr>
      ))}
    </tbody>
  );
});
