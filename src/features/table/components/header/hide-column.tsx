import { $, component$, useComputed$ } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { LuEye, LuEyeOff } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { updateColumnPartially } from '~/services';
import { type Column, TEMPORAL_ID, useColumnsStore } from '~/state';

export const HideColumn = component$<{
  column: Column;
  label?: string;
}>(({ column, label }) => {
  const { columns, updateColumn } = useColumnsStore();
  const isDisabled = useComputed$(
    () =>
      columns.value.filter((c) => c.id !== TEMPORAL_ID).filter((c) => c.visible)
        .length === 1 && column.visible,
  );

  const hideColumn = $(async () => {
    column.visible = !column.visible;
    updateColumn({ ...column });

    if (column.id === TEMPORAL_ID) {
      return;
    }

    server$(async (id: string, visible: boolean) => {
      await updateColumnPartially({ id, visible });
    })(column.id, column.visible);
  });

  if (column.id === TEMPORAL_ID) {
    return null;
  }

  return (
    <Button
      class="flex flex-row gap-1 justify-start font-light py-1 h-auto"
      look="ghost"
      size="sm"
      onClick$={hideColumn}
      disabled={isDisabled.value}
    >
      {column.visible ? (
        <LuEye class="text-sm text-neutral" />
      ) : (
        <LuEyeOff class="text-sm text-neutral" />
      )}
      {label ?? 'Hide column'}
    </Button>
  );
});
