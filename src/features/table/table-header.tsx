import { $, component$, useComputed$ } from '@builder.io/qwik';
import { TbPlus } from '@qwikest/icons/tablericons';
import { Button } from '~/components';
import { useActiveModal, useModals } from '~/components/hooks';
import { RunExecutionSidebar } from '~/features/run-execution/run-execution-sidebar';
import { ColumnIcon } from '~/features/table/table';
import { type Column, useColumnsStore } from '~/state';
import { useEditColumn } from '~/usecases/edit-column.usecase';

export const useRunExecutionModal = () => {
  const { openRunExecutionSidebar, closeRunExecutionSidebar } = useModals(
    'runExecutionSidebar',
  );

  return {
    openRunExecutionSidebar,
    closeRunExecutionSidebar,
  };
};

export const TableHeader = component$(() => {
  const { state: columns, replaceCell } = useColumnsStore();
  const editColumn = useEditColumn();
  const { args } = useActiveModal();
  const { openAddDynamicColumnSidebar } = useModals('addDynamicColumnSidebar');
  const { openRunExecutionSidebar, closeRunExecutionSidebar } =
    useRunExecutionModal();

  const editCell = $((columnSelected: Column) => {
    openRunExecutionSidebar({
      columnId: columnSelected.id,
    });
  });

  const onUpdateCell = $(async (column: Column) => {
    closeRunExecutionSidebar();

    const response = await editColumn(column);

    for await (const { cell } of response) {
      replaceCell(cell.cell);
    }
  });

  const indexColumnEditing = useComputed$(() =>
    columns.value.findIndex((column) => column.id === args.value?.columnId),
  );

  return (
    <thead>
      <tr>
        {columns.value.map((column, index) => (
          <>
            <th
              key={column.id}
              id={column.id}
              class="border-b border-r cursor-pointer border-gray-200 bg-white px-3 py-2 text-left font-medium text-gray-600 sticky top-0 last:border-r-0 z-0"
              onDblClick$={() => editCell(column)}
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <ColumnIcon type={column.type} kind={column.kind} />
                  <span class="text-sm font-medium text-gray-700">
                    {column.name}
                  </span>
                </div>
                <div class="h-full w-px cursor-col-resize hover:bg-gray-200" /> 
                {columns.value.length === index + 1 ? (
                  <Button
                    look="ghost"
                    class="h-2"
                    onClick$={() =>
                      openAddDynamicColumnSidebar({
                        columnId: column.id,
                      })
                    }
                  >
                    <TbPlus />
                  </Button>
                ) : null}
              </div>
            </th>

            {indexColumnEditing.value === index ? (
              <th key="temporal" class="w-[300px]" />
            ) : null}
          </>
        ))}
      </tr>

      <RunExecutionSidebar onUpdateColumn={onUpdateCell} />
    </thead>
  );
});
