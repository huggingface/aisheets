import { Fragment, component$ } from '@builder.io/qwik';
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
          <Fragment key={column.id}>
            <TableCellHeader column={column} />

            {column.id === columnId.value && (
              <ExecutionForm
                column={column}
                onGenerateColumn={onGenerateColumn}
              />
            )}
          </Fragment>
        ))}

        <TableAddCellHeaderPlaceHolder />
      </tr>
    </thead>
  );
});
