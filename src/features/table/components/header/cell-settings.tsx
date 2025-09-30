import { $, component$, Slot } from '@builder.io/qwik';
import { LuPanelRight } from '@qwikest/icons/lucide';
import { useExecution } from '~/features/add-column';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const CellSettings = component$<{ column: Column }>(({ column }) => {
  const { columnId, open } = useExecution();
  const { removeTemporalColumn } = useColumnsStore();

  const editCell = $(async () => {
    if (column.id === TEMPORAL_ID) return;
    if (column.id === columnId.value) return;

    await removeTemporalColumn();

    open('edit', {
      columnId: column.id,
    });
  });

  if (column.id === TEMPORAL_ID || column.kind !== 'dynamic') {
    return null;
  }

  return (
    <div
      class="p-2 cursor-pointer flex flex-row gap-1 items-center hover:bg-neutral-100 rounded-full"
      onClick$={editCell}
      role="button"
      tabIndex={0}
      aria-label="Edit column"
      preventdefault:click
      stoppropagation:click
    >
      <LuPanelRight class="text-sm text-neutral" />
      <Slot />
    </div>
  );
});
