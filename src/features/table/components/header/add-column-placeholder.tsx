import { $, component$, useComputed$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
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
    if (lastColumnId.value === TEMPORAL_ID) return;

    await addTemporalColumn();

    nextTick(() => {
      open(TEMPORAL_ID, 'add');
    });
  });

  return (
    <th
      id={lastColumnId.value}
      class={cn('visible pr-2', {
        hidden: lastColumnId.value === TEMPORAL_ID,
      })}
    >
      <Button
        onClick$={handleNewColumn}
        look="ghost"
        size="sm"
        class="ml-6 w-[30px] h-[30px] bg-transparent text-primary rounded-full hover:bg-primary-100  flex items-center justify-center p-0"
      >
        <LuPlus class="text-lg" />
      </Button>
    </th>
  );
});
