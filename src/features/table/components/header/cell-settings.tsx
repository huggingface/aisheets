import { $, Slot, component$ } from '@builder.io/qwik';
import { LuSettings2 } from '@qwikest/icons/lucide';
import { nextTick } from '~/components/hooks/tick';
import { useExecution } from '~/features/add-column';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const CellSettings = component$<{ column: Column }>(({ column }) => {
  const { open } = useExecution();
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
      class="py-1 px-1.5 cursor-pointer flex flex-row gap-1 items-center"
      onClick$={editCell}
      role="button"
      tabIndex={0}
      aria-label="Edit column"
    >
      <LuSettings2 class="text-sm text-neutral" />
      <Slot />
    </div>
  );
});
