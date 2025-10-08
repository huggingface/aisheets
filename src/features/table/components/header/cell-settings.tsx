import { $, component$ } from '@builder.io/qwik';
import { LuPanelRight } from '@qwikest/icons/lucide';
import { useExecution } from '~/features/add-column';
import { type Column, useColumnsStore } from '~/state';

export const CellSettings = component$<{ column: Column }>(({ column }) => {
  const { columnId, open } = useExecution();
  const { removeTemporalColumn } = useColumnsStore();

  const editCell = $(async () => {
    if (column.id === columnId.value) return;

    await removeTemporalColumn();

    open('edit', {
      columnId: column.id,
    });
  });

  if (column.kind !== 'dynamic') {
    return null;
  }

  return (
    <div
      class="p-[3px] cursor-pointer rounded-[3px] border border-[#E5E7EB] bg-white"
      onClick$={editCell}
      role="button"
      tabIndex={0}
      aria-label="Edit column"
      preventdefault:click
      stoppropagation:click
    >
      <div class="px-[8px] py-[4px] hover:bg-neutral-200 rounded-[1px]">
        <LuPanelRight class="text-sm text-neutral" />
      </div>
    </div>
  );
});
