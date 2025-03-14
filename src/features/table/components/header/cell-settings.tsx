import { $, Slot, component$ } from '@builder.io/qwik';
import { LuSettings2 } from '@qwikest/icons/lucide';
import { nextTick } from '~/components/hooks/tick';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
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
    <Tooltip text="Edit column">
      <div
        class="p-1.5 rounded-full hover:bg-neutral-200 cursor-pointer transition-colors flex flex-row gap-1 items-center"
        onClick$={editCell}
        role="button"
        tabIndex={0}
        aria-label="Edit column"
      >
        <LuSettings2 class="text-sm text-neutral" />
        <Slot />
      </div>
    </Tooltip>
  );
});
