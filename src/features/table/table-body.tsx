import { component$, useComputed$ } from '@builder.io/qwik';
import { useActiveModal } from '~/components';
import { TableCell } from '~/features/table/table-cell';
import { type Cell, type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

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
        column,
        updatedAt: new Date(),
        idx: rowIndex,
      };
    }

    return cell;
  };

  return (
    <tbody>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <tr key={rowIndex} class="hover:bg-gray-50/50 transition-colors">
          {columns.value.map((column, index) => {
            const cell = getCell(column, rowIndex);

            return (
              <>
                {column.id === TEMPORAL_ID ? (
                  <td
                    key={`temporal-${rowIndex}`}
                    class="min-w-80 w-80 max-w-80 px-2 min-h-[100px] h-[100px] border-[0.5px]"
                  />
                ) : (
                  <TableCell key={`${cell.id}-${cell.updatedAt}`} cell={cell} />
                )}

                <TableCellHeaderForExecution
                  key={`${column.id}-${index}`}
                  index={index}
                />
              </>
            );
          })}

          <td class="min-w-80 w-80 max-w-80 min-h-[100px] h-[100px] border-[0.5px] border-r-0" />
        </tr>
      ))}
    </tbody>
  );
});

const TableCellHeaderForExecution = component$<{ index: number }>(
  ({ index }) => {
    const { state: columns } = useColumnsStore();
    const { args } = useActiveModal();

    const indexColumnEditing = useComputed$(() =>
      columns.value.findIndex((column) => column.id === args.value?.columnId),
    );

    if (indexColumnEditing.value !== index) return null;

    return <th class="min-w-80 w-80 max-w-80" />;
  },
);
