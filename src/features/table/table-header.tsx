import { $, component$, useSignal } from '@builder.io/qwik';
import { useModals } from '~/components/hooks';
import { RunExecutionSidebar } from '~/features/run-execution/run-execution-sidebar';
import { ColumnIcon } from '~/features/table/table';
import { type Column, useColumnsStore } from '~/state';
import { useReRunExecution } from '~/usecases/run-execution.usecase';

export const TableHeader = component$(() => {
  const { state: columns, replaceCell } = useColumnsStore();
  const runExecution = useReRunExecution();
  const { openRunExecutionSidebar, closeRunExecutionSidebar } = useModals(
    'runExecutionSidebar',
  );
  const selectedColumnForExecution = useSignal<Column>();

  const handleHeaderClick = $((columnSelected: Column) => {
    selectedColumnForExecution.value = columnSelected;

    openRunExecutionSidebar();
  });

  const onRunExecution = $(async (columnId: string) => {
    closeRunExecutionSidebar();

    const response = await runExecution(columnId);

    for await (const { cell } of response) {
      replaceCell(cell);
    }
  });

  return (
    <thead>
      <tr>
        <th class="max-w-8 border bg-gray-50 px-2 py-2 text-center hover:bg-sky-100">
          <input type="checkbox" />
        </th>

        {columns.value.map((column) => (
          <th
            key={column.id}
            class="bg-purple-200 text-left font-light hover:bg-purple-50"
            onDblClick$={() => handleHeaderClick(column)}
          >
            <div class="flex flex-row items-center justify-between">
              <div class="flex w-full items-center gap-1 px-2">
                <ColumnIcon type={column.type} kind={column.kind} />
                {column.name}
              </div>
              <div class="h-8  w-2 cursor-col-resize" />
            </div>
          </th>
        ))}
      </tr>

      <RunExecutionSidebar
        column={selectedColumnForExecution}
        onRunExecution={onRunExecution}
      />
    </thead>
  );
});
