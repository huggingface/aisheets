import { $, component$, useComputed$, useVisibleTask$ } from '@builder.io/qwik';
import { LuPlus } from '@qwikest/icons/lucide';
import { Button, useModals } from '~/components';
import { nextTick } from '~/components/hooks/tick';
import { TEMPORAL_ID, useColumnsStore } from '~/state';

export const TableAddCellHeaderPlaceHolder = component$(() => {
  const { openAddDynamicColumnSidebar, closeAddDynamicColumnSidebar } =
    useModals('addDynamicColumnSidebar');
  const { state: columns, addTemporalColumn } = useColumnsStore();

  const lastColumnId = useComputed$(
    () => columns.value[columns.value.length - 1].id,
  );

  useVisibleTask$(async ({ track }) => {
    track(columns);
    if (columns.value.length === 1 && lastColumnId.value === TEMPORAL_ID) {
      nextTick(() => {
        openAddDynamicColumnSidebar({
          columnId: lastColumnId.value,
          mode: 'create',
        });
      });
    }
  });

  const handleNewColumn = $(async () => {
    await addTemporalColumn();
    await closeAddDynamicColumnSidebar();

    nextTick(() => {
      openAddDynamicColumnSidebar({
        columnId: TEMPORAL_ID,
        mode: 'create',
      });
    });
  });

  return (
    <th
      id={lastColumnId.value}
      class="min-w-[300px w-[300px] max-w-[300px] border-b border-secondary bg-primary py-1 text-left"
    >
      <Button look="ghost" size="sm" onClick$={handleNewColumn}>
        <LuPlus class="text-primary-foreground" />
      </Button>
    </th>
  );
});
