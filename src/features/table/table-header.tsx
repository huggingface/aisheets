import { Fragment, component$ } from '@builder.io/qwik';
import { ExecutionForm, useExecution } from '~/features/add-column';
import { useGenerateColumn } from '~/features/execution';
import {
  TableAddCellHeaderPlaceHolder,
  TableCellHeader,
} from '~/features/table/components/header';
import { TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableHeader = component$(() => {
  const { onGenerateColumn } = useGenerateColumn();
  const { columns } = useColumnsStore();
  const { columnId } = useExecution();

  return (
    <thead class="sticky top-0 bg-white z-20">
      <tr>
        {columns.value
          .filter((c) => c.visible)
          .map((column) => (
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

        {columns.value.filter((c) => c.id !== TEMPORAL_ID).length >= 1 && (
          <TableAddCellHeaderPlaceHolder />
        )}
      </tr>
    </thead>
  );
});
