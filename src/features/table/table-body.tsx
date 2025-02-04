import { component$, useComputed$ } from '@builder.io/qwik';
import { useActiveModal } from '~/components';
import { TableCell } from '~/features/table/table-cell';
import { type Cell, type Column, useColumnsStore } from '~/state';

export const TableBody = component$(() => {
  const { state: columns } = useColumnsStore();
  const rowCount = columns.value[0]?.cells.length || 0;
  const { args } = useActiveModal();

  const getCell = (column: Column, rowIndex: number): Cell => {
    const cell = column.cells[rowIndex];

    if (!cell) {
      return {
        id: `${column.id}-${rowIndex}`,
        value: '',
        error: '',
        validated: false,
        column,
        updatedAt: new Date(),
        idx: rowIndex,
      };
    }

    return cell;
  };

  const indexColumnEditing = useComputed$(() =>
    columns.value.findIndex((column) => column.id === args.value?.columnId),
  );

  return (
    <tbody>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr
          key={rowIndex}
          class="border-b border-gray-200 hover:bg-gray-50/50 transition-colors"
        >
          {columns.value.map((column, columnIndex) => {
            const cell = getCell(column, rowIndex);

            return (
              <>
                <TableCell
                  key={`${cell.id}-${cell.updatedAt}`}
                  cell={cell}
                  class="border-r border-gray-200 last:border-r-0"
                />
                {indexColumnEditing.value === columnIndex ? (
                  <th key="temporal" class="w-[300px]">
                    <h2>sdasd</h2>
                  </th>
                ) : null}
              </>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
});
