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
      class="min-w-64 w-64 max-w-64 px-2 border-[0.5px] border-t-0 border-r-0 border-b-0 border-secondary bg-primary text-left"
    >
      <Button
        look="ghost"
        size="sm"
        disabled={lastColumnId.value === TEMPORAL_ID}
        onClick$={handleNewColumn}
      >
        <LuPlus class="text-primary-foreground" />
      </Button>
    </th>
  );
});
