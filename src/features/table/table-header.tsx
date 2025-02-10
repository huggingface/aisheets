import { component$ } from '@builder.io/qwik';
import {
  TableAddCellHeaderPlaceHolder,
  TableCellHeader,
  TableCellHeaderForExecution,
} from '~/features/table/components/header';
import { useColumnsStore } from '~/state';

export const TableHeader = component$(() => {
  const { state: columns } = useColumnsStore();

  return (
    <thead>
      <tr>
        {columns.value.map((column, index) => (
          <>
            <TableCellHeader key={column.id} column={column} />

            <TableCellHeaderForExecution
              key={`${column.id}-${index}`}
              index={index}
            />
          </>
        ))}

        <TableAddCellHeaderPlaceHolder />
      </tr>
    </thead>
  );
});
