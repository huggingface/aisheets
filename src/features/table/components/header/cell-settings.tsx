import { $, component$ } from '@builder.io/qwik';
import { LuSettings2 } from '@qwikest/icons/lucide';
import { Button, useModals } from '~/components';
import { nextTick } from '~/components/hooks/tick';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const CellSettings = component$<{ column: Column }>(({ column }) => {
  const { openAddDynamicColumnSidebar, closeAddDynamicColumnSidebar } =
    useModals('addDynamicColumnSidebar');
  const { removeTemporalColumn } = useColumnsStore();

  const editCell = $(async () => {
    if (column.id === TEMPORAL_ID) return;

    await removeTemporalColumn();
    await closeAddDynamicColumnSidebar();

    nextTick(() => {
      openAddDynamicColumnSidebar({
        columnId: column.id,
        mode: 'edit',
      });
    });
  });

  if (column.id === TEMPORAL_ID) {
    return null;
  }

  return (
    <Button look="ghost" size="sm" onClick$={editCell}>
      <LuSettings2 class="text-primary-foreground" />
    </Button>
  );
});
