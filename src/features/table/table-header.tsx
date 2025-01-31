import { $, component$, useSignal } from '@builder.io/qwik';
import { useModals } from '~/components/hooks';
import { RunExecutionSidebar } from '~/features/run-execution/run-execution-sidebar';
import { ColumnIcon } from '~/features/table/table';
import { type Column, useColumnsStore } from '~/state';
import { useEditColumn } from '~/usecases/edit-column.usecase';

export const TableHeader = component$(() => {
  const { state: columns, replaceCell } = useColumnsStore();
  const editColumn = useEditColumn();
  const { openRunExecutionSidebar, closeRunExecutionSidebar } = useModals(
    'runExecutionSidebar',
  );
  const selectedColumnForExecution = useSignal<Column>();

  const handleHeaderClick = $((columnSelected: Column) => {
    selectedColumnForExecution.value = columnSelected;

    openRunExecutionSidebar();
  });

  const onUpdateColumn = $(async (column: Column) => {
    closeRunExecutionSidebar();

    const response = await editColumn(column);

    for await (const { cell } of response) {
      replaceCell(cell);
    }
  });

  return (
    <thead>
      <tr>
        {columns.value.map((column) => (
          <th
            key={column.id}
            class="border-b border-r cursor-pointer border-gray-200 bg-white px-3 py-2 text-left font-medium text-gray-600 sticky top-0 last:border-r-0 z-0"
            onDblClick$={() => handleHeaderClick(column)}
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <ColumnIcon
                  type={column.type}
                  kind={column.kind}
                  class="h-3.5 w-3.5 text-gray-400"
                />
                <span class="text-sm font-medium text-gray-700">
                  {column.name}
                </span>
              </div>
              <div class="h-full w-px cursor-col-resize hover:bg-gray-200" />
            </div>
          </th>
        ))}
      </tr>
      <RunExecutionSidebar
        column={selectedColumnForExecution}
        onUpdateColumn={onUpdateColumn}
      />
    </thead>
  );
});
