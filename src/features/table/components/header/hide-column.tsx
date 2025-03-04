import { $, component$, useComputed$ } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { LuEyeOff } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { updateColumnPartially } from '~/services';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const HideColumn = component$<{ column: Column }>(({ column }) => {
  const { columns, updateColumn } = useColumnsStore();
  const isTheUniqueColumn = useComputed$(
    () =>
      columns.value.filter((c) => c.visible).filter((c) => c.id !== TEMPORAL_ID)
        .length === 1,
  );

  const hideColumn = $(async () => {
    column.visible = false;
    updateColumn({ ...column });

    if (column.id === TEMPORAL_ID) {
      return;
    }

    server$(async (id: string) => {
      await updateColumnPartially({ id, visible: false });
    })(column.id);
  });

  if (column.id === TEMPORAL_ID || isTheUniqueColumn.value) {
    return null;
  }

  return (
    <Button
      class="flex flex-row gap-1 justify-start font-light"
      look="ghost"
      size="sm"
      onClick$={hideColumn}
    >
      <LuEyeOff class="text-primary-foreground" />
      Hide column
    </Button>
  );
});
