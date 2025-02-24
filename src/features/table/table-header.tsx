import { component$ } from '@builder.io/qwik';
import { ExecutionForm, useExecution } from '~/features/add-column';
import { useGenerateColumn } from '~/features/execution';
import {
  TableAddCellHeaderPlaceHolder,
  TableCellHeader,
} from '~/features/table/components/header';
import { useColumnsStore } from '~/state';

export const TableHeader = component$(() => {
  const onGenerateColumn = useGenerateColumn();
  const { state: columns } = useColumnsStore();
  const { columnId } = useExecution();

  return (
    <thead>
      <tr>
        {columns.value.map((column) => (
          <>
            <TableCellHeader key={column.id} column={column} />

            {columnId.value === column.id && (
              <ExecutionForm onGenerateColumn={onGenerateColumn} />
            )}
          </>
        ))}

        <TableAddCellHeaderPlaceHolder />
      </tr>
    </thead>
  );
});
