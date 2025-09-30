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
      class="px-2 py-1 cursor-pointer flex flex-row gap-1 items-center rounded-[3px] border border-[#E5E7EB] hover:bg-neutral-200 bg-white"
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
