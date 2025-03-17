import { $, component$, useComputed$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuPlus } from '@qwikest/icons/lucide';
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
    <th
      id={lastColumnId.value}
      class="min-w-80 w-80 max-w-80 px-2 border-[0.25px] border-t-0 border-r-0 border-neutral-300 bg-white text-left"
    >
      <div
        class={cn(
          'p-1.5 rounded-full hover:bg-neutral-100 cursor-pointer transition-colors flex items-center justify-center w-8 h-8',
          lastColumnId.value === TEMPORAL_ID &&
            'opacity-50 cursor-not-allowed hover:bg-transparent',
        )}
        onClick$={
          lastColumnId.value !== TEMPORAL_ID ? handleNewColumn : undefined
        }
        role="button"
        tabIndex={0}
        aria-label="Add column"
        aria-disabled={lastColumnId.value === TEMPORAL_ID}
      >
        <LuPlus class="text-primary text-lg" />
      </div>
    </th>
  );
});
