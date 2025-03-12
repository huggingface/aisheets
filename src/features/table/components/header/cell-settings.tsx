import { $, Slot, component$ } from '@builder.io/qwik';
import { LuSettings2 } from '@qwikest/icons/lucide';
import { Button } from '~/components';
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
    <Button
      class="flex flex-row gap-1 justify-start font-light rounded-full"
      look="ghost"
      size="sm"
      onClick$={editCell}
    >
      <LuSettings2 class="text-sm text-primary-foreground" />
      <Slot />
    </Button>
  );
});
