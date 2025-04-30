import { $, component$, useComputed$ } from '@builder.io/qwik';
import { LuPlus } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { nextTick } from '~/components/hooks/tick';
import { useExecution } from '~/features/add-column';
import { TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableAddCellHeaderPlaceHolder = component$(() => {
  const { open } = useExecution();
  const { columns, addTemporalColumn } = useColumnsStore();

  const lastColumnId = useComputed$(
    () => columns.value[columns.value.length - 1].id,
  );

  const handleNewColumn = $(async () => {
    await addTemporalColumn();

    nextTick(() => {
      open(TEMPORAL_ID, 'add');
    });
  });

  return (
    <th id={lastColumnId.value}>
      <Button
        onClick$={
          lastColumnId.value !== TEMPORAL_ID ? handleNewColumn : undefined
        }
        size="sm"
        class="ml-6 h-[30px] w-[30px] bg-primary-50 border-0 text-primary rounded-full hover:bg-primary-100"
      >
        <LuPlus class="w-4 h-4" />
      </Button>
    </th>
  );
});
