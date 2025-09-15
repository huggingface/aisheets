import { $, component$, Slot } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuSettings2 } from '@qwikest/icons/lucide';
import { nextTick } from '~/components/hooks/tick';
import { useExecution } from '~/features/add-column';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const CellSettings = component$<{ column: Column }>(({ column }) => {
  const { open, columnId } = useExecution();
  const { removeTemporalColumn } = useColumnsStore();

  const editCell = $(async () => {
    if (column.id === TEMPORAL_ID) return;
    await removeTemporalColumn();

    nextTick(() => {
      open(column.id, 'edit');
    });
  });

  if (column.id === TEMPORAL_ID || column.kind !== 'dynamic') {
    return null;
  }

  return (
    <div
      class={cn(
        'p-2 cursor-pointer flex flex-row gap-1 items-center hover:bg-neutral-100 rounded-full',
        {
          'hover:bg-neutral-300': columnId.value === column.id,
        },
      )}
      onClick$={editCell}
      role="button"
      tabIndex={0}
      aria-label="Edit column"
      preventdefault:click
      stoppropagation:click
    >
      <LuSettings2 class="text-sm text-neutral" />
      <Slot />
    </div>
  );
});
